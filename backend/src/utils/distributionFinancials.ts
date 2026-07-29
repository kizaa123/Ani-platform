import { DistributionRecipientRole } from '@prisma/client';
import prisma from '../database/prisma';
import { formatFarmerIncomingOrder, formatUserLocation } from './orders';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';

/** Remainder after Fellow / FLO / CLO splits on released buyer orders. */
export const ANI_PLATFORM_SHARE_PERCENT = 13.34;

export function aniPlatformShareAmount(totalAmount: number): number {
  return Math.round(((totalAmount * ANI_PLATFORM_SHARE_PERCENT) / 100) * 100) / 100;
}

export function isReleasedProductOrder(order: {
  escrowStatus: string;
  otpVerifiedAt: Date | null;
}): boolean {
  return order.escrowStatus === 'RELEASED' || order.otpVerifiedAt != null;
}

export function orderShareRecognizedAt(order: {
  paymentReleasedAt: Date | null;
  otpVerifiedAt: Date | null;
  createdAt: Date;
}): Date {
  return order.paymentReleasedAt ?? order.otpVerifiedAt ?? order.createdAt;
}

const distributionOrderSelect = {
  id: true,
  buyerId: true,
  farmerId: true,
  listingId: true,
  createdAt: true,
  quantity: true,
  unit: true,
  unitPrice: true,
  totalAmount: true,
  status: true,
  paymentMethod: true,
  transactionId: true,
  trackStage: true,
  trackUpdatedAt: true,
  escrowStatus: true,
  otpVerifiedAt: true,
  paymentReleasedAt: true,
  releaseOtp: true,
  listing: {
    include: {
      commodity: { include: { category: true } },
      media: { orderBy: { orderIndex: 'asc' as const } },
    },
  },
  buyer: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      country: true,
      region: true,
      city: true,
      address: true,
      profilePicture: true,
    },
  },
  farmer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      country: true,
      region: true,
      city: true,
      address: true,
      profilePicture: true,
      farmerProfile: { select: { farmName: true } },
    },
  },
} as const;

export async function fetchDistributedLines(
  recipientUserId: string,
  roles: DistributionRecipientRole[]
) {
  return prisma.orderDistributionLine.findMany({
    where: {
      recipientUserId,
      role: { in: roles },
      status: 'DISTRIBUTED',
      distributedAt: { not: null },
    },
    include: {
      distribution: {
        include: {
          order: { select: distributionOrderSelect },
        },
      },
    },
    orderBy: { distributedAt: 'desc' },
  });
}

export async function fetchFarmerDistributedLines(farmerUserId: string) {
  return fetchDistributedLines(farmerUserId, ['FARMER']);
}

type DistributedLine = Awaited<ReturnType<typeof fetchDistributedLines>>[number];

export function orderListingLabels(listing: { title: string; description?: string | null }) {
  const orderName = listing.title;
  const orderDescription = listing.description?.trim() || listing.title;
  return { orderName, orderDescription };
}

export function mapDistributionToFarmerSaleLineItem(line: DistributedLine) {
  const order = line.distribution.order;
  const formatted = formatFarmerIncomingOrder(order);
  const { orderName, orderDescription } = orderListingLabels(order.listing);

  return {
    id: line.id,
    date: line.distributedAt!.toISOString(),
    title: orderName,
    productName: orderName,
    orderName,
    orderDescription,
    productImage: formatted.productImage,
    commodity: formatted.commodity,
    category: formatted.category,
    quantity: formatted.quantity,
    unit: formatted.unit,
    unitPrice: formatted.unitPrice,
    totalValue: line.amount,
    status: 'DISTRIBUTED',
    type: 'SALE' as const,
    buyerName: formatted.buyerName,
    buyerEmail: formatted.buyerEmail,
    buyerPhone: formatted.buyerPhone,
    buyerLocation: formatted.buyerLocation,
    buyerCountry: formatted.buyerCountry,
    buyerProfilePicture: formatted.buyerProfilePicture,
    paymentMethod: line.paymentMethod ?? '',
    transactionId: line.transactionId,
    purchaseCount: 1,
    orderId: order.id,
  };
}

export function mapDistributionToHandlerPayment(line: DistributedLine) {
  const order = line.distribution.order;
  const { orderName, orderDescription } = orderListingLabels(order.listing);
  const isFarmerHandlerLine = line.role === 'FARMER_HANDLER';

  return {
    id: line.id,
    date: line.distributedAt!.toISOString(),
    ownerId: isFarmerHandlerLine ? order.farmerId : order.buyerId,
    clientName: isFarmerHandlerLine
      ? order.farmer.farmerProfile?.farmName ??
        `${order.farmer.firstName} ${order.farmer.lastName}`
      : `${order.buyer.firstName} ${order.buyer.lastName}`,
    description: orderName,
    orderName,
    orderDescription,
    counterpartyName: isFarmerHandlerLine
      ? `${order.buyer.firstName} ${order.buyer.lastName}`
      : order.farmer.farmerProfile?.farmName ??
        `${order.farmer.firstName} ${order.farmer.lastName}`,
    amount: line.amount,
    type: 'DISTRIBUTION' as const,
    paymentMethod: line.paymentMethod ?? '',
    status: 'DISTRIBUTED',
    transactionId: line.transactionId,
    orderId: order.id,
  };
}

export function mapDistributionToFarmerClientPayment(line: DistributedLine) {
  const order = line.distribution.order;
  const { orderName, orderDescription } = orderListingLabels(order.listing);

  return {
    id: line.id,
    date: line.distributedAt!.toISOString(),
    ownerId: order.farmerId,
    clientName:
      order.farmer.farmerProfile?.farmName ??
      `${order.farmer.firstName} ${order.farmer.lastName}`,
    description: orderName,
    orderName,
    orderDescription,
    counterpartyName: `${order.buyer.firstName} ${order.buyer.lastName}`,
    amount: line.amount,
    type: 'SALE' as const,
    paymentMethod: line.paymentMethod ?? '',
    status: 'DISTRIBUTED',
    transactionId: line.transactionId,
    orderId: order.id,
  };
}

export function farmerClientLabel(farmer: {
  firstName: string;
  lastName: string;
  farmerProfile: { farmName: string } | null;
}) {
  return farmer.farmerProfile?.farmName ?? `${farmer.firstName} ${farmer.lastName}`;
}

export function buyerClientLabel(buyer: {
  firstName: string;
  lastName: string;
  buyerProfile?: { company: string | null } | null;
}) {
  return buyer.buyerProfile?.company ?? `${buyer.firstName} ${buyer.lastName}`;
}

export function farmerLocation(farmer: {
  city: string | null;
  region: string;
  country: string;
  address: string | null;
}) {
  return formatUserLocation(farmer);
}

export function farmerProfilePicture(profilePicture: string | null | undefined) {
  return normalizePublicAssetUrl(profilePicture ?? null);
}
