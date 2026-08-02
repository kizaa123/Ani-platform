import { z } from 'zod';
import prisma from '../database/prisma';
import { assertFound, assertAuthorized, AppError } from '../utils/errors';
import { isFarmerRole, PORTAL_DIRECTORY_ROLES, portalDirectoryRoleLabel, ROLES } from '../constants/roles';
import { categoryMatchesFarmerRole } from '../constants/commodities';
import {
  LISTING_UNITS,
  assertUnitForRole,
  defaultListingUnit,
} from '../constants/units';
import {
  fetchFarmerDistributedLines,
  fetchHandlerDistributionLines,
  mapDistributionToFarmerPendingLine,
  mapDistributionToFarmerSaleLineItem,
} from '../utils/distributionFinancials';
import {
  groupFarmerIncomingOrders,
  orderInclude,
  type FarmerIncomingOrderRow,
} from '../utils/orders';
import { ORDER_TRACK_STAGES, type OrderTrackStage, ORDER_TRACK_LABELS } from '../constants/orderTrack';
import {
  notifyOrderTracked,
  getUserDisplayName,
  notifyFarmProductsAvailable,
} from './notification.service';
import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { formatVerificationTags, verificationTagSelect } from '../utils/verificationTags';
import { listingCommodityName, listingCommodityCategory } from '../utils/listingDisplay';

export const updateOrderTrackSchema = z.object({
  buyerId: z.string().uuid(),
  listingId: z.string().uuid(),
  trackStage: z.enum(ORDER_TRACK_STAGES),
});

export const updateFarmSchema = z.object({
  farmName: z.string().min(2).optional(),
  farmSize: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
});

export const addCommoditySchema = z.object({
  commodityId: z.number().int(),
  quantity: z.number().min(0),
  unit: z.enum(LISTING_UNITS).optional(),
  description: z.string().optional(),
});

export const notifyClientSchema = z.object({
  clientId: z.string().uuid(),
  message: z.string().min(1).max(500).optional(),
});

export class FarmService {
  async getProfile(userId: string, roleId: number) {
    assertAuthorized(isFarmerRole(roleId), 'Farmer profile only available to farmers');
    return assertFound(
      await prisma.farmerProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              region: true,
              city: true,
              country: true,
              profilePicture: true,
              verificationStatus: true,
            },
          },
          farmerCommodities: { include: { commodity: { include: { category: true, variants: true } } } },
          listings: { include: { commodity: true }, orderBy: { createdAt: 'desc' } },
        },
      }),
      'Farmer profile not found'
    );
  }

  async updateProfile(userId: string, roleId: number, data: z.infer<typeof updateFarmSchema>) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can update farm profile');
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
    return prisma.farmerProfile.update({ where: { id: profile.id }, data });
  }

  async addCommodity(userId: string, roleId: number, data: z.infer<typeof addCommoditySchema>) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can add commodities');
    const requiredLabel =
      roleId === ROLES.CROP_FARMER
        ? 'crop'
        : roleId === ROLES.LIVESTOCK_FARMER
          ? 'livestock'
          : 'commodity';
    const commodity = await prisma.commodity.findUnique({
      where: { id: data.commodityId },
      include: { category: true },
    });
    if (
      !commodity ||
      !categoryMatchesFarmerRole(
        commodity.category.name,
        roleId,
        ROLES.CROP_FARMER,
        ROLES.LIVESTOCK_FARMER,
        ROLES.ORGANIZATION_FARMER
      )
    ) {
      throw new AppError(400, `Commodity must belong to a ${requiredLabel} category for your farmer role`);
    }

    const unit = data.unit ?? defaultListingUnit(roleId);
    assertUnitForRole(roleId, unit);

    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile required'
    );
    return prisma.farmerCommodity.upsert({
      where: { farmerId_commodityId: { farmerId: profile.id, commodityId: data.commodityId } },
      update: { ...data, unit },
      create: { farmerId: profile.id, ...data, unit },
      include: { commodity: { include: { category: true } } },
    });
  }

  async listCommodities(userId: string) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
    return prisma.farmerCommodity.findMany({
      where: { farmerId: profile.id },
      include: { commodity: { include: { category: true, variants: true } } },
    });
  }

  async removeCommodity(userId: string, commodityRecordId: string) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
    const record = assertFound(
      await prisma.farmerCommodity.findFirst({
        where: { id: commodityRecordId, farmerId: profile.id },
      }),
      'Commodity not found'
    );
    await prisma.farmerCommodity.delete({ where: { id: record.id } });
  }

  async getOrders(userId: string, roleId: number) {
    assertAuthorized(isFarmerRole(roleId), 'Orders only available to farmers');
    return this.fetchFarmerOrders(userId);
  }

  async updateOrderTrackForFarmer(
    userId: string,
    roleId: number,
    buyerId: string,
    listingId: string,
    trackStage: OrderTrackStage
  ) {
    assertAuthorized(isFarmerRole(roleId), 'Order tracking only available to farmers');
    return this.updateOrderTrack(userId, buyerId, listingId, trackStage);
  }

  async fetchFarmerOrders(farmerUserId: string) {
    const orders = await prisma.productOrder.findMany({
      where: { farmerId: farmerUserId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return groupFarmerIncomingOrders(orders);
  }

  async updateOrderTrack(
    farmerUserId: string,
    buyerId: string,
    listingId: string,
    trackStage: OrderTrackStage
  ) {
    const result = await prisma.productOrder.updateMany({
      where: { farmerId: farmerUserId, buyerId, listingId },
      data: { trackStage, trackUpdatedAt: new Date() },
    });

    if (result.count === 0) {
      throw new AppError(404, 'Order not found');
    }

    const orders = await prisma.productOrder.findMany({
      where: { farmerId: farmerUserId, buyerId, listingId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });

    const grouped = groupFarmerIncomingOrders(orders as FarmerIncomingOrderRow[]);

    const listing = await prisma.commodityListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        images: true,
        unit: true,
        media: { where: { type: 'IMAGE' }, orderBy: { orderIndex: 'asc' }, take: 1 },
      },
    });
    const latestOrder = orders[0];
    const farmerName = await getUserDisplayName(farmerUserId);
    const normalized = normalizeImages(listing?.images);
    const imageFromMedia = listing?.media[0]?.url;
    const imageUrl = imageFromMedia
      ? normalizePublicAssetUrl(imageFromMedia)
      : normalized[0]
        ? normalizePublicAssetUrl(normalized[0])
        : null;
    await notifyOrderTracked(
      buyerId,
      farmerUserId,
      farmerName,
      listing?.title ?? 'your order',
      ORDER_TRACK_LABELS[trackStage],
      latestOrder
        ? {
            totalAmount: latestOrder.totalAmount,
            quantity: latestOrder.quantity,
            unit: latestOrder.unit,
            imageUrl,
            listingId: listing?.id,
          }
        : { imageUrl, listingId: listing?.id }
    );

    return grouped[0] ?? null;
  }

  async getFinancialStatement(userId: string, roleId: number) {
    assertAuthorized(isFarmerRole(roleId), 'Financial statement only available to farmers');
    return this.buildFinancialStatement(userId);
  }

  async buildFinancialStatement(farmerUserId: string) {
    const profile = assertFound(
      await prisma.farmerProfile.findUnique({
        where: { userId: farmerUserId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, country: true, region: true } },
          listings: {
            where: { status: { not: 'ARCHIVED' } },
            include: { commodity: { include: { category: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      'Farmer profile not found'
    );

    const [acceptedConnections, pendingConnections, distributedLines, pendingLines] =
      await Promise.all([
        prisma.connectionRequest.count({
          where: { farmerId: farmerUserId, status: 'ACCEPTED' },
        }),
        prisma.connectionRequest.count({
          where: { farmerId: farmerUserId, status: 'PENDING' },
        }),
        fetchFarmerDistributedLines(farmerUserId),
        fetchHandlerDistributionLines(farmerUserId, ['FARMER'], ['PENDING']),
      ]);

    const lineItems = profile.listings.map((listing) => {
      const totalValue = listing.quantity * listing.price;
      return {
        id: listing.id,
        date: listing.createdAt.toISOString(),
        title: listing.title,
        commodity: listingCommodityName(listing),
        category: listingCommodityCategory(listing),
        quantity: listing.quantity,
        unit: listing.unit,
        unitPrice: listing.price,
        totalValue,
        status: listing.status,
        type: 'LISTING' as const,
      };
    });

    const salesLineItems = distributedLines.map(mapDistributionToFarmerSaleLineItem);
    const pendingDistributions = pendingLines.map(mapDistributionToFarmerPendingLine);
    const pendingDistributionTotal = pendingDistributions.reduce(
      (sum, line) => sum + line.shareAmount,
      0
    );

    const activeItems = lineItems.filter((l) => l.status === 'ACTIVE');
    const soldItems = lineItems.filter((l) => l.status === 'SOLD');
    const archivedItems = lineItems.filter((l) => l.status === 'ARCHIVED');

    const sumTotalValue = (items: typeof lineItems) =>
      items.reduce((acc, l) => acc + l.totalValue, 0);

    const totalSalesRevenue = salesLineItems.reduce((acc, s) => acc + s.totalValue, 0);

    return {
      farmName: profile.farmName,
      farmerName: `${profile.user.firstName} ${profile.user.lastName}`,
      email: profile.user.email,
      country: profile.user.country,
      region: profile.user.region,
      generatedAt: new Date().toISOString(),
      summary: {
        activeListings: activeItems.length,
        totalListedValue: sumTotalValue(activeItems),
        soldListings: soldItems.length,
        totalSoldValue: sumTotalValue(soldItems),
        totalSalesRevenue,
        totalSalesCount: salesLineItems.length,
        archivedListings: archivedItems.length,
        acceptedConnections,
        pendingConnections,
        totalProducts: lineItems.length,
        pendingDistributionCount: pendingDistributions.length,
        pendingDistributionTotal,
      },
      lineItems,
      salesLineItems,
      pendingDistributions,
    };
  }

  async listClients(userId: string, roleId: number) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can list clients');
    const clients = await prisma.user.findMany({
      where: {
        roleId: { in: [...PORTAL_DIRECTORY_ROLES] },
        id: { not: userId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        city: true,
        region: true,
        country: true,
        roleId: true,
        verificationStatus: true,
        verificationTags: { select: verificationTagSelect },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return clients.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      profilePicture: normalizePublicAssetUrl(c.profilePicture),
      city: c.city,
      region: c.region,
      country: c.country,
      roleId: c.roleId,
      roleLabel: portalDirectoryRoleLabel(c.roleId),
      verificationStatus: c.verificationStatus,
      verificationTags: formatVerificationTags(c.verificationTags),
    }));
  }

  async notifyClient(
    farmerUserId: string,
    roleId: number,
    data: z.infer<typeof notifyClientSchema>
  ) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can notify clients');
    const client = assertFound(
      await prisma.user.findFirst({
        where: { id: data.clientId, roleId: { in: [...PORTAL_DIRECTORY_ROLES] } },
        select: { id: true },
      }),
      'Client not found'
    );
    await notifyFarmProductsAvailable({
      farmerUserId,
      clientId: client.id,
      customMessage: data.message,
    });
    return { success: true };
  }
}

export const farmService = new FarmService();
