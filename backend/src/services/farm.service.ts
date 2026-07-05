import { z } from 'zod';
import prisma from '../database/prisma';
import { assertFound, assertAuthorized, AppError } from '../utils/errors';
import { isFarmerRole, ROLES } from '../constants/roles';
import { categoryMatchesFarmerRole } from '../constants/commodities';
import {
  LISTING_UNITS,
  assertUnitForRole,
  defaultListingUnit,
} from '../constants/units';
import {
  groupFarmerIncomingOrders,
  orderInclude,
  type FarmerIncomingOrderRow,
} from '../utils/orders';
import { ORDER_TRACK_STAGES, type OrderTrackStage, ORDER_TRACK_LABELS } from '../constants/orderTrack';
import {
  notifyOrderTracked,
  getUserDisplayName,
} from './notification.service';

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
    const requiredLabel = roleId === ROLES.CROP_FARMER ? 'crop' : 'livestock';
    const commodity = await prisma.commodity.findUnique({
      where: { id: data.commodityId },
      include: { category: true },
    });
    if (
      !commodity ||
      !categoryMatchesFarmerRole(commodity.category.name, roleId, ROLES.CROP_FARMER, ROLES.LIVESTOCK_FARMER)
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
      select: { title: true },
    });
    const farmerName = await getUserDisplayName(farmerUserId);
    await notifyOrderTracked(
      buyerId,
      farmerUserId,
      farmerName,
      listing?.title ?? 'your order',
      ORDER_TRACK_LABELS[trackStage]
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
            include: { commodity: { include: { category: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      'Farmer profile not found'
    );

    const [acceptedConnections, pendingConnections, paidOrders] = await Promise.all([
      prisma.connectionRequest.count({
        where: { farmerId: farmerUserId, status: 'ACCEPTED' },
      }),
      prisma.connectionRequest.count({
        where: { farmerId: farmerUserId, status: 'PENDING' },
      }),
      prisma.productOrder.findMany({
        where: { farmerId: farmerUserId, status: 'PAID' },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const lineItems = profile.listings.map((listing) => {
      const totalValue = listing.quantity * listing.price;
      return {
        id: listing.id,
        date: listing.createdAt.toISOString(),
        title: listing.title,
        commodity: listing.commodity.name,
        category: listing.commodity.category.name,
        quantity: listing.quantity,
        unit: listing.unit,
        unitPrice: listing.price,
        totalValue,
        status: listing.status,
        type: 'LISTING' as const,
      };
    });

    const groupedPaidOrders = groupFarmerIncomingOrders(paidOrders);

    const salesLineItems = groupedPaidOrders.map((formatted) => ({
      id: formatted.id,
      date: formatted.date,
      title: formatted.productName,
      productName: formatted.productName,
      productImage: formatted.productImage,
      commodity: formatted.commodity,
      category: formatted.category,
      quantity: formatted.quantity,
      unit: formatted.unit,
      unitPrice: formatted.unitPrice,
      totalValue: formatted.totalAmount,
      status: formatted.status,
      type: 'SALE' as const,
      buyerName: formatted.buyerName,
      buyerEmail: formatted.buyerEmail,
      buyerPhone: formatted.buyerPhone,
      buyerLocation: formatted.buyerLocation,
      buyerCountry: formatted.buyerCountry,
      buyerProfilePicture: formatted.buyerProfilePicture,
      paymentMethod: formatted.paymentMethod,
      transactionId: formatted.transactionId,
      purchaseCount: formatted.purchaseCount,
    }));

    const activeItems = lineItems.filter((l) => l.status === 'ACTIVE');
    const soldItems = lineItems.filter((l) => l.status === 'SOLD');
    const archivedItems = lineItems.filter((l) => l.status === 'ARCHIVED');

    const sum = (items: typeof lineItems) =>
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
        totalListedValue: sum(activeItems),
        soldListings: soldItems.length,
        totalSoldValue: sum(soldItems),
        totalSalesRevenue,
        totalSalesCount: salesLineItems.length,
        archivedListings: archivedItems.length,
        acceptedConnections,
        pendingConnections,
        totalProducts: lineItems.length,
      },
      lineItems,
      salesLineItems,
    };
  }
}

export const farmService = new FarmService();
