import { z } from 'zod';
import prisma from '../database/prisma';
import { assertFound, AppError } from '../utils/errors';
import { ROLES, FARMER_ROLES, isFarmerRole, isStaffRole } from '../constants/roles';
import {
  buyerHasFarmerFarmAccess,
  buyerFarmAccessSet,
  buyerHasActiveAccess,
  maskListing,
  fullListing,
  ListingViewContext,
  RegisteredCommodity,
} from '../middleware/access.middleware';
import { normalizeImages } from '../middleware/upload.middleware';
import { formatHarvestLabel, parseHarvestDate, toHarvestDateInput } from '../utils/harvest';
import {
  LISTING_UNITS,
  assertUnitForRole,
  defaultListingUnit,
} from '../constants/units';

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
      message: 'Harvest end date must be on or after start date',
      path: ['harvestEndDate'],
    });
  }
};

export const listingBaseSchema = z.object({
  commodityId: z.number().int(),
  title: z.string().min(3),
  description: z.string().optional(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  unit: z.enum(LISTING_UNITS).optional(),
  images: z.array(z.string()).optional(),
  location: z.string().optional(),
  harvestStartDate: harvestDateField,
  harvestEndDate: harvestDateField,
});

export const listingSchema = listingBaseSchema.superRefine(harvestDateRefine);

export const updateListingSchema = listingBaseSchema.partial().superRefine(harvestDateRefine);

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
    if (isFarmerRole(roleId) || isStaffRole(roleId) || roleId === ROLES.FARMER_HANDLER) {
      return { hasAccess: true, connectionStatus: 'ACCEPTED', hasFarmAccess: true };
    }
    if (roleId === ROLES.BUYER) {
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
      commodity: unknown;
      farmer: Parameters<MarketplaceService['buildContext']>[0];
    },
    access: { hasAccess: boolean; connectionStatus: string; hasFarmAccess?: boolean }
  ) {
    const ctx = this.buildContext(listing.farmer);
    const base = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      quantity: listing.quantity,
      price: listing.price,
      unit: listing.unit,
      images: normalizeImages(listing.images),
      location: listing.location,
      ...harvestPayload(listing),
      status: listing.status,
      createdAt: listing.createdAt,
      commodity: listing.commodity,
    };
    const extras = {
      connectionStatus: access.connectionStatus,
      farmerAccess: access.hasAccess,
      hasFarmAccess: access.hasFarmAccess ?? access.hasAccess,
    };

    return access.hasAccess
      ? fullListing(base as Record<string, unknown>, ctx, extras)
      : maskListing(base as Record<string, unknown>, ctx, extras);
  }

  async createListing(userId: string, roleId: number, data: z.infer<typeof listingSchema>) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile required'
    );

    const unit = data.unit ?? defaultListingUnit(roleId);
    assertUnitForRole(roleId, unit);
    assertLivestockQuantity(roleId, data.quantity);

    return prisma.commodityListing.create({
      data: {
        farmerId: profile.id,
        commodityId: data.commodityId,
        title: data.title,
        description: data.description,
        quantity: data.quantity,
        price: data.price,
        unit,
        images: data.images ?? [],
        location: data.location,
        ...listingHarvestFields(data),
      },
      include: { commodity: { include: { category: true } } },
    });
  }

  async browseMarketplace(userId: string, roleId: number, search?: string) {
    const isBuyerRole = roleId === ROLES.BUYER;
    const farmAccessSet = isBuyerRole ? await buyerFarmAccessSet(userId) : new Set<string>();
    const connectionMap = isBuyerRole ? await this.buyerConnectionMap(userId) : new Map<string, string>();

    const accessPackage = await prisma.accessPackage.findFirst({ orderBy: { price: 'asc' } });

    const farmerProfiles = await prisma.farmerProfile.findMany({
      where: {
        user: {
          roleId: { in: [...FARMER_ROLES] },
          ...(isFarmerRole(roleId) ? { id: userId } : {}),
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

    const farmers = farmerProfiles.map((profile) => {
      const farmerUserId = profile.user.id;
      const hasFarmAccess =
        isFarmerRole(roleId) || isStaffRole(roleId) || roleId === ROLES.FARMER_HANDLER
          ? true
          : isBuyerRole
            ? farmAccessSet.has(farmerUserId)
            : false;

      const connectionStatus = isBuyerRole
        ? connectionMap.get(farmerUserId) ?? 'NONE'
        : hasFarmAccess
          ? 'ACCEPTED'
          : 'NONE';

      const hasAccess =
        isFarmerRole(roleId) || isStaffRole(roleId) || roleId === ROLES.FARMER_HANDLER
          ? true
          : hasFarmAccess && connectionStatus === 'ACCEPTED';

      const access = {
        hasAccess,
        connectionStatus,
        hasFarmAccess,
      };

      const registeredCommodities = this.buildRegisteredCommodities(profile.farmerCommodities);

      const products = hasFarmAccess
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
              access
            )
          )
        : [];

      return {
        farmerId: farmerUserId,
        farmerName: `${profile.user.firstName} ${profile.user.lastName}`,
        farmName: profile.farmName,
        farmSize: profile.farmSize,
        profilePicture: profile.user.profilePicture,
        country: profile.user.country,
        region: profile.user.region,
        city: profile.user.city,
        verificationStatus: profile.user.verificationStatus,
        registeredCommodities,
        connectionStatus: access.connectionStatus,
        hasFarmAccess,
        canViewProducts: access.hasAccess,
        farmAccessFee: accessPackage?.price ?? null,
        farmAccessPriceLabel: accessPackage ? `GHC ${accessPackage.price}` : null,
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
          ...profile.listings.map((l) => l.title),
          ...profile.listings.map((l) => l.commodity.name),
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
      farmAccessFee: accessPackage?.price ?? null,
      farmAccessPriceLabel: accessPackage ? `GHC ${accessPackage.price}` : null,
      farmers: filtered,
    };
  }

  async listPublic(userId: string, roleId: number) {
    const listings = await prisma.commodityListing.findMany({
      where: { status: { in: ['ACTIVE', 'SOLD'] } },
      include: {
        commodity: { include: { category: true } },
        farmer: { include: farmerInclude },
      },
      orderBy: { createdAt: 'desc' },
    });

    const isBuyerRole = roleId === ROLES.BUYER;
    const farmAccessSet = isBuyerRole ? await buyerFarmAccessSet(userId) : undefined;

    return Promise.all(
      listings.map(async (l) => {
        const access = await this.listingAccess(userId, roleId, l.farmer.user.id, farmAccessSet);
        return this.formatListing(l, access);
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

    const farmAccessSet =
      roleId === ROLES.BUYER ? await buyerFarmAccessSet(userId) : undefined;
    const access = await this.listingAccess(
      userId,
      roleId,
      listing.farmer.user.id,
      farmAccessSet
    );
    return this.formatListing(listing, access);
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
      assertUnitForRole(roleId, data.unit);
    }
    if (data.quantity !== undefined) {
      assertLivestockQuantity(roleId, data.quantity);
    }
    const { harvestStartDate, harvestEndDate, images, ...rest } = data;
    return prisma.commodityListing.update({
      where: { id: existing.id },
      data: {
        ...rest,
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
    await prisma.commodityListing.delete({ where: { id: existing.id } });
  }

  async myListings(userId: string) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
    const listings = await prisma.commodityListing.findMany({
      where: { farmerId: profile.id },
      include: { commodity: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => ({
      ...l,
      images: normalizeImages(l.images),
      priceLabel: `GHC ${l.price}/${l.unit}`,
      quantityLabel: `${l.quantity} ${l.unit}`,
      ...harvestPayload(l),
    }));
  }
}

export const marketplaceService = new MarketplaceService();
