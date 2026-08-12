import { z } from 'zod';
import { randomUUID } from 'crypto';
import prisma from '../database/prisma';
import { assertFound, AppError } from '../utils/errors';
import {
  ROLES,
  FARMER_ROLES,
  isFarmerRole,
  isStaffRole,
  canPurchaseFromMarketplace,
} from '../constants/roles';
import {
  buyerFarmAccessSet,
  buyerHasActiveAccess,
  maskListing,
  fullListing,
  ListingViewContext,
  RegisteredCommodity,
} from '../middleware/access.middleware';
import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { formatHarvestLabel, parseHarvestDate, toHarvestDateInput } from '../utils/harvest';
import {
  LISTING_UNITS,
  validateListingUnit,
  defaultListingUnit,
} from '../constants/units';
import { computeListedPrice } from '../utils/listingPrice';
import { listingCommodityName } from '../utils/listingDisplay';
import { productMediaService } from './productMedia.service';
import { notifyNewProductListing } from './notification.service';
import { FARM_ACCESS_PRICE_GHC, formatFarmAccessPriceLabel } from '../constants/pricing';
import { formatPricePerUnit } from '../utils/currency';
import {
  computeFarmAccessExpiry,
  hasPaidFarmAccessRecord,
  isFarmAccessRecordValid,
  isListingOrderable,
  resolveFarmAccessCycleId,
} from './farmAccess.service';

export { LISTING_UNITS } from '../constants/units';

function assertLivestockQuantity(roleId: number, quantity: number | undefined) {
  if (quantity === undefined) return;
  if (roleId === ROLES.LIVESTOCK_FARMER && !Number.isInteger(quantity)) {
    throw new AppError(400, 'Livestock quantity must be a whole number of animals');
  }
}

const harvestDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(''));

const harvestDateRefine = (
  data: { harvestStartDate?: string | null; harvestEndDate?: string | null },
  ctx: z.RefinementCtx
) => {
  const start = parseHarvestDate(data.harvestStartDate);
  const end = parseHarvestDate(data.harvestEndDate);
  if (start && end && end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Delivery end date must be on or after start date',
      path: ['harvestEndDate'],
    });
  }
};

const commodityRefine = (
  data: { commodityId?: number; customCommodityName?: string | null },
  ctx: z.RefinementCtx
) => {
  const hasCatalog = data.commodityId !== undefined && data.commodityId > 0;
  const custom = data.customCommodityName?.trim();
  const hasCustom = Boolean(custom);
  if (!hasCatalog && !hasCustom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a commodity or enter a custom commodity name',
      path: ['commodityId'],
    });
  }
  if (hasCatalog && hasCustom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either a catalog commodity or a custom name, not both',
      path: ['customCommodityName'],
    });
  }
};

const listingFieldsSchema = z.object({
  commodityId: z.number().int().positive().optional(),
  customCommodityName: z.string().min(2).max(100).optional(),
  title: z.string().min(3),
  description: z.string().optional(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  unit: z.string().min(1).max(50).optional(),
  images: z.array(z.string()).optional(),
  location: z.string().optional(),
  harvestStartDate: harvestDateField,
  harvestEndDate: harvestDateField,
});

export const listingBaseSchema = listingFieldsSchema.superRefine(commodityRefine);

export const listingSchema = listingFieldsSchema
  .superRefine(commodityRefine)
  .superRefine(harvestDateRefine);

export const updateListingSchema = listingFieldsSchema.partial().superRefine((data, ctx) => {
  harvestDateRefine(data, ctx);
  if (data.commodityId !== undefined || data.customCommodityName !== undefined) {
    commodityRefine(
      {
        commodityId: data.commodityId,
        customCommodityName: data.customCommodityName,
      },
      ctx
    );
  }
});

function listingHarvestFields(data: {
  harvestStartDate?: string | null;
  harvestEndDate?: string | null;
}) {
  return {
    harvestStartDate: parseHarvestDate(data.harvestStartDate),
    harvestEndDate: parseHarvestDate(data.harvestEndDate),
  };
}

function harvestPayload(listing: {
  harvestStartDate?: Date | null;
  harvestEndDate?: Date | null;
}) {
  const harvestStartDate = toHarvestDateInput(listing.harvestStartDate);
  const harvestEndDate = toHarvestDateInput(listing.harvestEndDate);
  return {
    harvestStartDate,
    harvestEndDate,
    harvestLabel: formatHarvestLabel(listing.harvestStartDate, listing.harvestEndDate),
  };
}

const farmerInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      country: true,
      region: true,
      phone: true,
      email: true,
      city: true,
      address: true,
    },
  },
  farmerCommodities: {
    include: {
      commodity: { include: { category: true } },
    },
  },
} as const;

export class MarketplaceService {
  private async viewerCountry(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    });
    return user?.country?.trim() || 'Ghana';
  }

  private async buyerConnectionMap(buyerId: string) {
    const rows = await prisma.connectionRequest.findMany({ where: { buyerId } });
    return new Map(rows.map((r) => [r.farmerId, r.status]));
  }

  private async listingAccess(
    userId: string,
    roleId: number,
    farmerUserId: string,
    farmAccessSet?: Set<string>
  ): Promise<{ hasAccess: boolean; connectionStatus: string; hasFarmAccess: boolean }> {
    if (isStaffRole(roleId)) {
      return { hasAccess: true, connectionStatus: 'ACCEPTED', hasFarmAccess: true };
    }
    if (isFarmerRole(roleId) && farmerUserId === userId) {
      return { hasAccess: true, connectionStatus: 'ACCEPTED', hasFarmAccess: true };
    }
    if (canPurchaseFromMarketplace(roleId)) {
      const hasFarmAccess = farmAccessSet?.has(farmerUserId) ?? false;
      const connectionMap = await this.buyerConnectionMap(userId);
      const connectionStatus = connectionMap.get(farmerUserId) ?? 'NONE';
      const hasAccess = hasFarmAccess && connectionStatus === 'ACCEPTED';
      return { hasAccess, connectionStatus, hasFarmAccess };
    }
    const global = await buyerHasActiveAccess(userId);
    return {
      hasAccess: global,
      connectionStatus: global ? 'ACCEPTED' : 'NONE',
      hasFarmAccess: global,
    };
  }

  private buildRegisteredCommodities(
    farmerCommodities: Array<{
      unit: string;
      commodity: { id: number; name: string; category: { name: string } };
    }>
  ): RegisteredCommodity[] {
    return farmerCommodities.map((fc) => ({
      id: fc.commodity.id,
      name: fc.commodity.name,
      category: fc.commodity.category.name,
      unit: fc.unit,
    }));
  }

  private buildContext(
    farmer: {
      farmName: string;
      farmSize: string | null;
      experienceYears: number | null;
      user: ListingViewContext['farmerUser'];
      farmerCommodities: Array<{
        unit: string;
        commodity: { id: number; name: string; category: { name: string } };
      }>;
    }
  ): ListingViewContext {
    return {
      farmerUser: farmer.user,
      farmerProfile: {
        farmName: farmer.farmName,
        farmSize: farmer.farmSize,
        experienceYears: farmer.experienceYears,
      },
      registeredCommodities: this.buildRegisteredCommodities(farmer.farmerCommodities),
    };
  }

  private formatListing(
    listing: {
      id: string;
      title: string;
      description: string | null;
      quantity: number;
      price: number;
      unit: string;
      images: unknown;
      location: string | null;
      harvestStartDate?: Date | null;
      harvestEndDate?: Date | null;
      status: string;
      createdAt: Date;
      customCommodityName?: string | null;
      commodity: unknown;
      farmer: Parameters<MarketplaceService['buildContext']>[0];
    },
    access: { hasAccess: boolean; connectionStatus: string; hasFarmAccess?: boolean },
    media: ReturnType<typeof productMediaService.listByListing> extends Promise<infer T> ? T : never = [],
    viewerCountry?: string | null
  ) {
    const ctx = this.buildContext(listing.farmer);
    const base = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      quantity: listing.quantity,
      price: listing.price,
      unit: listing.unit,
      images: normalizeImages(listing.images).map(
        (img) => normalizePublicAssetUrl(img) ?? img
      ),
      media,
      location: listing.location,
      ...harvestPayload(listing),
      status: listing.status,
      createdAt: listing.createdAt,
      commodity: listing.commodity,
      customCommodityName: listing.customCommodityName,
    };
    const extras = {
      connectionStatus: access.connectionStatus,
      farmerAccess: access.hasAccess,
      hasFarmAccess: access.hasFarmAccess ?? access.hasAccess,
    };

    return access.hasAccess
      ? {
          ...fullListing(base as Record<string, unknown>, ctx, extras, viewerCountry),
          available: isListingOrderable({
            status: listing.status,
            quantity: listing.quantity,
            harvestEndDate: listing.harvestEndDate,
          }),
        }
      : {
          ...maskListing(base as Record<string, unknown>, ctx, extras),
          available: isListingOrderable({
            status: listing.status,
            quantity: listing.quantity,
            harvestEndDate: listing.harvestEndDate,
          }),
        };
  }

  async createListing(userId: string, roleId: number, data: z.infer<typeof listingSchema>) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile required'
    );

    const unit = validateListingUnit(roleId, data.unit ?? defaultListingUnit(roleId));
    assertLivestockQuantity(roleId, data.quantity);

    const customCommodityName = data.customCommodityName?.trim() || null;
    const commodityId = customCommodityName ? null : (data.commodityId ?? null);

    const listing = await prisma.$transaction(async (tx) => {
      await tx.farmerProfile.update({
        where: { id: profile.id },
        data: { farmAccessCycleId: randomUUID() },
      });

      return tx.commodityListing.create({
        data: {
          farmerId: profile.id,
          commodityId,
          customCommodityName,
          title: data.title,
          description: data.description,
          quantity: data.quantity,
          price: computeListedPrice(data.price),
          unit,
          images: data.images ?? [],
          location: data.location,
          ...listingHarvestFields(data),
        },
        include: {
          commodity: { include: { category: true } },
          farmer: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
      });
    });

    const farmerName = `${listing.farmer.user.firstName} ${listing.farmer.user.lastName}`.trim();
    notifyNewProductListing({
      farmerUserId: userId,
      farmerName,
      listing: {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        unit: listing.unit,
        images: listing.images,
      },
    }).catch(() => undefined);

    return listing;
  }

  async browseMarketplace(userId: string, roleId: number, search?: string) {
    if (roleId === ROLES.FARMER_HANDLER || roleId === ROLES.BUYER_HANDLER) {
      throw new AppError(
        403,
        roleId === ROLES.FARMER_HANDLER
          ? 'Marketplace access is not available for fellow liaison officers'
          : 'Marketplace access is not available for client liaison officers'
      );
    }

    const isPurchaserRole = canPurchaseFromMarketplace(roleId);
    const connectionMap = isPurchaserRole ? await this.buyerConnectionMap(userId) : new Map<string, string>();
    const accessRecords = isPurchaserRole
      ? await prisma.buyerFarmerAccess.findMany({
          where: { buyerId: userId },
          select: {
            farmerId: true,
            status: true,
            expiresAt: true,
            accessCycleId: true,
            createdAt: true,
          },
        })
      : [];
    const accessRecordMap = new Map(accessRecords.map((r) => [r.farmerId, r]));

    const viewerCountry = await this.viewerCountry(userId);
    const farmAccessPriceLabel = formatFarmAccessPriceLabel(viewerCountry);

    const farmerProfiles = await prisma.farmerProfile.findMany({
      where: {
        user: {
          roleId: { in: [...FARMER_ROLES] },
          ...(isFarmerRole(roleId) ? { id: { not: userId } } : {}),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            country: true,
            region: true,
            city: true,
            verificationStatus: true,
            verificationTags: { select: { id: true, tagType: true, createdAt: true } },
          },
        },
        farmerCommodities: {
          include: { commodity: { include: { category: true } } },
        },
        listings: {
          where: { status: { in: ['ACTIVE', 'SOLD'] } },
          include: { commodity: { include: { category: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { farmName: 'asc' },
    });

    const term = search?.trim().toLowerCase() ?? '';

    const allListingIds = farmerProfiles.flatMap((p) => p.listings.map((l) => l.id));
    const mediaMap = await productMediaService.listForListings(allListingIds, userId);

    const farmers = farmerProfiles.map((profile) => {
      const farmerUserId = profile.user.id;
      const orderableListings = profile.listings.filter((l) => isListingOrderable(l));
      const hasAvailableProduct = orderableListings.length > 0;
      const fallbackExpiry = computeFarmAccessExpiry(profile.listings);
      const newestListingCreatedAt =
        profile.listings.length > 0
          ? profile.listings.reduce(
              (max, l) => (l.createdAt > max ? l.createdAt : max),
              profile.listings[0].createdAt
            )
          : null;
      const accessRecord = accessRecordMap.get(farmerUserId);

      const hasValidFarmAccess = isStaffRole(roleId)
        ? true
        : isPurchaserRole
          ? isFarmAccessRecordValid(
              accessRecord,
              resolveFarmAccessCycleId(profile.farmAccessCycleId, profile.id),
              fallbackExpiry,
              newestListingCreatedAt
            )
          : false;

      const farmAccessExpired =
        isPurchaserRole &&
        hasPaidFarmAccessRecord(accessRecord) &&
        !hasValidFarmAccess;

      const hasFarmAccess = hasValidFarmAccess;

      const connectionStatus = isPurchaserRole
        ? connectionMap.get(farmerUserId) ?? 'NONE'
        : hasFarmAccess
          ? 'ACCEPTED'
          : 'NONE';

      const canViewFarm = isStaffRole(roleId)
        ? true
        : hasValidFarmAccess && connectionStatus === 'ACCEPTED';

      const canViewProducts = canViewFarm;

      const hasAccess = isStaffRole(roleId)
        ? true
        : canViewFarm && hasAvailableProduct;

      const access = {
        hasAccess,
        connectionStatus,
        hasFarmAccess,
      };

      const registeredCommodities = this.buildRegisteredCommodities(profile.farmerCommodities);

      const products =
        isStaffRole(roleId) || hasValidFarmAccess
          ? profile.listings.map((listing) =>
              this.formatListing(
                {
                  ...listing,
                  farmer: {
                    farmName: profile.farmName,
                    farmSize: profile.farmSize,
                    experienceYears: profile.experienceYears,
                    user: profile.user,
                    farmerCommodities: profile.farmerCommodities,
                  },
                },
                access,
                mediaMap.get(listing.id) ?? [],
                viewerCountry
              )
            )
          : [];

      const requiresFarmAccessPayment =
        isPurchaserRole && hasAvailableProduct && !hasValidFarmAccess;

      return {
        farmerId: farmerUserId,
        farmerName: `${profile.user.firstName} ${profile.user.lastName}`,
        farmName: profile.farmName,
        farmSize: profile.farmSize,
        profilePicture: normalizePublicAssetUrl(profile.user.profilePicture),
        country: profile.user.country,
        region: profile.user.region,
        city: profile.user.city,
        verificationStatus: profile.user.verificationStatus,
        verificationTags: profile.user.verificationTags.map((tag) => ({
          id: tag.id,
          tagType: tag.tagType,
          createdAt: tag.createdAt.toISOString(),
        })),
        registeredCommodities,
        customProducts: profile.customProducts ?? [],
        connectionStatus: access.connectionStatus,
        hasFarmAccess,
        hasAvailableProduct,
        farmAccessExpired,
        requiresFarmAccessPayment,
        canViewProducts,
        farmAccessFee: FARM_ACCESS_PRICE_GHC,
        farmAccessPriceLabel: farmAccessPriceLabel,
        products,
        searchTerms: [
          profile.farmName,
          profile.user.firstName,
          profile.user.lastName,
          profile.user.country,
          profile.user.region,
          profile.user.city,
          ...registeredCommodities.map((c) => c.name),
          ...registeredCommodities.map((c) => c.category),
          ...(profile.customProducts ?? []),
          ...profile.listings.map((l) => l.title),
          ...profile.listings.map((l) => listingCommodityName(l)),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      };
    });

    const filtered = term
      ? farmers.filter((f) => f.searchTerms.includes(term))
      : farmers;

    return {
      farmAccessFee: FARM_ACCESS_PRICE_GHC,
      farmAccessPriceLabel: farmAccessPriceLabel,
      farmers: filtered,
    };
  }

  async listPublic(userId: string, roleId: number) {
    const viewerCountry = await this.viewerCountry(userId);
    const listings = await prisma.commodityListing.findMany({
      where: { status: { in: ['ACTIVE', 'SOLD'] } },
      include: {
        commodity: { include: { category: true } },
        farmer: { include: farmerInclude },
      },
      orderBy: { createdAt: 'desc' },
    });

    const farmAccessSet = canPurchaseFromMarketplace(roleId)
      ? await buyerFarmAccessSet(userId)
      : undefined;

    const listingIds = listings.map((l) => l.id);
    const mediaMap = await productMediaService.listForListings(listingIds, userId);

    return Promise.all(
      listings.map(async (l) => {
        const access = await this.listingAccess(userId, roleId, l.farmer.user.id, farmAccessSet);
        const media = mediaMap.get(l.id) ?? [];
        return this.formatListing(l, access, media, viewerCountry);
      })
    );
  }

  async getListing(id: string, userId: string, roleId: number) {
    const listing = assertFound(
      await prisma.commodityListing.findUnique({
        where: { id },
        include: {
          commodity: { include: { category: true } },
          farmer: { include: farmerInclude },
        },
      }),
      'Listing not found'
    );

    const farmAccessSet = canPurchaseFromMarketplace(roleId)
      ? await buyerFarmAccessSet(userId)
      : undefined;
    const access = await this.listingAccess(
      userId,
      roleId,
      listing.farmer.user.id,
      farmAccessSet
    );
    const media = await productMediaService.listByListing(id, userId);
    const viewerCountry = await this.viewerCountry(userId);
    return this.formatListing(listing, access, media, viewerCountry);
  }

  async updateListing(
    userId: string,
    roleId: number,
    listingId: string,
    data: Partial<z.infer<typeof listingSchema>>
  ) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
    const existing = assertFound(
      await prisma.commodityListing.findFirst({
        where: { id: listingId, farmerId: profile.id },
      }),
      'Listing not found or not owned by you'
    );
    if (data.unit !== undefined) {
      validateListingUnit(roleId, data.unit);
    }
    if (data.quantity !== undefined) {
      assertLivestockQuantity(roleId, data.quantity);
    }
    const { harvestStartDate, harvestEndDate, images, price, customCommodityName, commodityId, unit, ...rest } = data;

    const commodityUpdate =
      customCommodityName !== undefined || commodityId !== undefined
        ? {
            customCommodityName: customCommodityName?.trim() || null,
            commodityId: customCommodityName?.trim()
              ? null
              : commodityId !== undefined
                ? commodityId ?? null
                : undefined,
          }
        : {};

    return prisma.commodityListing.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...commodityUpdate,
        ...(unit !== undefined ? { unit: validateListingUnit(roleId, unit) } : {}),
        ...(price !== undefined ? { price: computeListedPrice(price) } : {}),
        ...(images !== undefined ? { images: normalizeImages(images) } : {}),
        ...(harvestStartDate !== undefined || harvestEndDate !== undefined
          ? listingHarvestFields({ harvestStartDate, harvestEndDate })
          : {}),
      },
      include: { commodity: { include: { category: true } } },
    });
  }

  async deleteListing(userId: string, listingId: string) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
    const existing = assertFound(
      await prisma.commodityListing.findFirst({
        where: { id: listingId, farmerId: profile.id },
      }),
      'Listing not found or not owned by you'
    );

    const orders = await prisma.productOrder.findMany({
      where: { listingId: existing.id },
      select: { status: true },
    });

    if (orders.some((o) => o.status === 'PENDING')) {
      throw new AppError(
        409,
        'Cannot remove this product while an order is pending',
        'LISTING_HAS_PENDING_ORDER'
      );
    }

    if (orders.length > 0) {
      await prisma.commodityListing.update({
        where: { id: existing.id },
        data: { status: 'ARCHIVED' },
      });
      return {
        mode: 'archived' as const,
        message:
          'Product removed from your farm. Order history has been preserved.',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.productMedia.deleteMany({ where: { listingId: existing.id } });
      await tx.commodityListing.delete({ where: { id: existing.id } });
    });

    return {
      mode: 'deleted' as const,
      message: 'Product removed from your farm',
    };
  }

  async myListings(userId: string) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({
        where: { userId },
        include: { user: { select: { country: true } } },
      }),
      'Farmer profile not found'
    );
    const farmerCountry = profile.user.country;
    const listings = await prisma.commodityListing.findMany({
      where: { farmerId: profile.id, status: { not: 'ARCHIVED' } },
      include: { commodity: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const mediaMap = await productMediaService.listForListings(
      listings.map((l) => l.id),
      userId
    );
    return listings.map((l) => ({
      ...l,
      images: normalizeImages(l.images).map(
        (img) => normalizePublicAssetUrl(img) ?? img
      ),
      media: mediaMap.get(l.id) ?? [],
      priceLabel: formatPricePerUnit(l.price, l.unit, farmerCountry),
      quantityLabel: `${l.quantity} ${l.unit}`,
      ...harvestPayload(l),
    }));
  }
}

export const marketplaceService = new MarketplaceService();
