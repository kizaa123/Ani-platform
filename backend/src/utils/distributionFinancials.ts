import { DistributionLineStatus, DistributionRecipientRole } from '@prisma/client';
import prisma from '../database/prisma';
import { formatFarmerIncomingOrder, formatUserLocation } from './orders';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';

/** Fellow share of order total. */
export const FARMER_SHARE_PERCENT = 66.66;
/** FLO share — 10 percentage points of order, taken from post-Fellow remainder. */
export const FARMER_HANDLER_SHARE_PERCENT = 10;
/** CLO share — 10 percentage points of order, taken from post-FLO remainder. */
export const BUYER_HANDLER_SHARE_PERCENT = 10;
/** ANI share — remainder after Fellow, FLO, and CLO (13.34% of order total). */
export const ANI_PLATFORM_SHARE_PERCENT =
  100 - FARMER_SHARE_PERCENT - FARMER_HANDLER_SHARE_PERCENT - BUYER_HANDLER_SHARE_PERCENT;

export type DistributionAmounts = {
  farmer: number;
  farmerHandler: number;
  buyerHandler: number;
  aniPlatform: number;
};

function roundGhc(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function distributionShareAmount(totalAmount: number, percentage: number): number {
  return roundGhc((totalAmount * percentage) / 100);
}

/**
 * Cascading remainder split on released orders:
 * Fellow 66.66%, then FLO 10pp and CLO 10pp of order total (sequential from remainder pool),
 * ANI receives the rounded GHC remainder so shares always sum to the order total.
 */
export function calculateDistributionAmounts(totalAmount: number): DistributionAmounts {
  const farmer = distributionShareAmount(totalAmount, FARMER_SHARE_PERCENT);
  const farmerHandler = distributionShareAmount(totalAmount, FARMER_HANDLER_SHARE_PERCENT);
  const buyerHandler = distributionShareAmount(totalAmount, BUYER_HANDLER_SHARE_PERCENT);
  const aniPlatform = roundGhc(totalAmount - farmer - farmerHandler - buyerHandler);
  return { farmer, farmerHandler, buyerHandler, aniPlatform };
}

export function aniPlatformShareAmount(totalAmount: number): number {
  return calculateDistributionAmounts(totalAmount).aniPlatform;
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
      verificationStatus: true,
      verificationTags: { select: { id: true, tagType: true, createdAt: true } },
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
      verificationStatus: true,
      verificationTags: { select: { id: true, tagType: true, createdAt: true } },
      farmerProfile: { select: { farmName: true } },
    },
  },
} as const;

export async function fetchHandlerDistributionLines(
  recipientUserId: string,
  roles: DistributionRecipientRole[],
  statuses: DistributionLineStatus[]
) {
  return prisma.orderDistributionLine.findMany({
    where: {
      recipientUserId,
      role: { in: roles },
      status: { in: statuses },
    },
    include: {
      distribution: {
        include: {
          order: { select: distributionOrderSelect },
        },
      },
    },
    orderBy: { distribution: { order: { createdAt: 'desc' } } },
  });
}

export async function fetchDistributedLines(
  recipientUserId: string,
  roles: DistributionRecipientRole[]
) {
  const lines = await fetchHandlerDistributionLines(recipientUserId, roles, ['DISTRIBUTED']);
  return lines
    .filter((line) => line.distributedAt != null)
    .sort((a, b) => b.distributedAt!.getTime() - a.distributedAt!.getTime());
}

export async function fetchFarmerDistributedLines(farmerUserId: string) {
  return fetchDistributedLines(farmerUserId, ['FARMER']);
}

type HandlerDistributionLine = Awaited<ReturnType<typeof fetchHandlerDistributionLines>>[number];
type DistributedLine = HandlerDistributionLine;

export function orderListingLabels(listing: { title: string }) {
  return { orderName: listing.title };
}

export function mapDistributionToFarmerSaleLineItem(line: DistributedLine) {
  const order = line.distribution.order;
  const formatted = formatFarmerIncomingOrder(order);
  const { orderName } = orderListingLabels(order.listing);

  return {
    id: line.id,
    date: line.distributedAt!.toISOString(),
    title: orderName,
    productName: orderName,
    orderName,
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

function handlerLinePartyNames(line: HandlerDistributionLine) {
  const order = line.distribution.order;
  const isFarmerHandlerLine = line.role === 'FARMER_HANDLER';

  return {
    ownerId: isFarmerHandlerLine ? order.farmerId : order.buyerId,
    relatedPartyName: isFarmerHandlerLine
      ? order.farmer.farmerProfile?.farmName ??
        `${order.farmer.firstName} ${order.farmer.lastName}`
      : `${order.buyer.firstName} ${order.buyer.lastName}`,
    counterpartyName: isFarmerHandlerLine
      ? `${order.buyer.firstName} ${order.buyer.lastName}`
      : order.farmer.farmerProfile?.farmName ??
        `${order.farmer.firstName} ${order.farmer.lastName}`,
  };
}

export function mapDistributionToFarmerPendingLine(line: HandlerDistributionLine) {
  const order = line.distribution.order;
  const formatted = formatFarmerIncomingOrder(order);
  const { orderName } = orderListingLabels(order.listing);

  return {
    id: line.id,
    date: order.createdAt.toISOString(),
    orderId: order.id,
    orderName,
    buyerName: formatted.buyerName,
    shareAmount: line.amount,
    orderAmount: order.totalAmount,
    status: line.status,
  };
}

export function mapDistributionToHandlerPendingLine(line: HandlerDistributionLine) {
  const order = line.distribution.order;
  const { orderName } = orderListingLabels(order.listing);
  const parties = handlerLinePartyNames(line);

  return {
    id: line.id,
    date: order.createdAt.toISOString(),
    orderId: order.id,
    orderName,
    orderAmount: order.totalAmount,
    shareAmount: line.amount,
    status: line.status,
    ownerId: parties.ownerId,
    relatedPartyName: parties.relatedPartyName,
    clientName: parties.relatedPartyName,
    counterpartyName: parties.counterpartyName,
  };
}

export function mapDistributionToHandlerPayment(line: DistributedLine) {
  const order = line.distribution.order;
  const { orderName } = orderListingLabels(order.listing);
  const parties = handlerLinePartyNames(line);

  return {
    id: line.id,
    date: line.distributedAt!.toISOString(),
    ownerId: parties.ownerId,
    clientName: parties.relatedPartyName,
    description: orderName,
    orderName,
    counterpartyName: parties.counterpartyName,
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
  const { orderName } = orderListingLabels(order.listing);

  return {
    id: line.id,
    date: line.distributedAt!.toISOString(),
    ownerId: order.farmerId,
    clientName:
      order.farmer.farmerProfile?.farmName ??
      `${order.farmer.firstName} ${order.farmer.lastName}`,
    description: orderName,
    orderName,
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
