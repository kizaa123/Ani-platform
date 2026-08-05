import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { maxTrackStage, type OrderTrackStage } from '../constants/orderTrack';
import { formatVerificationTags, verificationTagSelect } from './verificationTags';
import { listingCommodityName, listingCommodityCategory } from './listingDisplay';

type BuyerFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  city: string | null;
  address: string | null;
  profilePicture: string | null;
  verificationStatus: string;
  verificationTags?: { id: string; tagType: string; createdAt: Date }[];
};

type FarmerFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  city: string | null;
  address: string | null;
  profilePicture?: string | null;
  verificationStatus: string;
  verificationTags?: { id: string; tagType: string; createdAt: Date }[];
  farmerProfile: { farmName: string } | null;
};

type ListingMediaFields = {
  type: string;
  url: string;
  orderIndex: number;
};

type ListingFields = {
  title: string;
  location: string | null;
  images: unknown;
  media?: ListingMediaFields[];
  commodity: { name: string; category: { name: string } } | null;
  customCommodityName?: string | null;
};

type OrderCore = {
  id: string;
  buyerId?: string;
  listingId?: string;
  createdAt: Date;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  trackStage?: string;
  trackUpdatedAt?: Date | null;
  escrowStatus?: string;
  otpVerifiedAt?: Date | null;
  paymentReleasedAt?: Date | null;
  releaseOtp?: string | null;
  listing: ListingFields;
};

export type FarmerIncomingOrderRow = OrderCore & { buyerId: string; listingId: string; buyer: BuyerFields };

export function formatUserLocation(user: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  address?: string | null;
}): string {
  const parts = [user.city, user.region, user.country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return user.address?.trim() || '-';
}

function productImage(listing: ListingFields): string | null {
  const media = listing.media ?? [];
  const imageMedia = media.find((m) => m.type === 'IMAGE') ?? media[0];
  if (imageMedia?.url) {
    return normalizePublicAssetUrl(imageMedia.url) ?? imageMedia.url;
  }
  const images = normalizeImages(listing.images).map((img) => normalizePublicAssetUrl(img) ?? img);
  return images[0] ?? null;
}

function escrowFields(order: OrderCore, perspective: 'buyer' | 'farmer') {
  const escrowStatus = order.escrowStatus ?? 'HELD';
  const canRelease =
    perspective === 'buyer' &&
    order.status === 'PAID' &&
    escrowStatus === 'HELD';

  return {
    orderId: order.id,
    escrowStatus,
    otpVerifiedAt: order.otpVerifiedAt?.toISOString() ?? null,
    paymentReleasedAt: order.paymentReleasedAt?.toISOString() ?? null,
    canRelease,
    releaseOtp: canRelease ? (order.releaseOtp ?? null) : null,
  };
}

/** Orders received by a farmer (buyer details shown). */
export function formatFarmerIncomingOrder(
  order: OrderCore & { buyerId: string; listingId: string; buyer: BuyerFields }
) {
  return {
    id: order.id,
    buyerId: order.buyerId,
    listingId: order.listingId,
    date: order.createdAt.toISOString(),
    productName: order.listing.title,
    productImage: productImage(order.listing),
    commodity: listingCommodityName(order.listing),
    category: listingCommodityCategory(order.listing),
    productLocation: order.listing.location,
    quantity: order.quantity,
    unit: order.unit,
    unitPrice: order.quantity > 0 ? order.totalAmount / order.quantity : order.unitPrice,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    transactionId: order.transactionId,
    trackStage: (order.trackStage ?? 'ORDER_RECEIVED') as OrderTrackStage,
    trackUpdatedAt: order.trackUpdatedAt?.toISOString() ?? null,
    buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`,
    buyerEmail: order.buyer.email,
    buyerPhone: order.buyer.phone,
    buyerLocation: formatUserLocation(order.buyer),
    buyerCountry: order.buyer.country,
    buyerProfilePicture: normalizePublicAssetUrl(order.buyer.profilePicture),
    buyerVerificationStatus: order.buyer.verificationStatus,
    buyerVerificationTags: formatVerificationTags(order.buyer.verificationTags ?? []),
    purchaseCount: 1,
    ...escrowFields(order, 'farmer'),
  };
}

/**
 * Format each incoming order for a farmer into a distinct order card item.
 */
export function groupFarmerIncomingOrders(orders: FarmerIncomingOrderRow[]) {
  return orders.map((order) => ({
    ...formatFarmerIncomingOrder(order),
    id: order.id,
    orderId: order.id,
    purchaseCount: 1,
  }));
}

/** Orders placed by a buyer (farmer details shown). */
export function formatBuyerPlacedOrder(
  order: OrderCore & { buyerId: string; farmerId: string; listingId: string; farmer: FarmerFields }
) {
  return {
    id: order.id,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    listingId: order.listingId,
    date: order.createdAt.toISOString(),
    productName: order.listing.title,
    productImage: productImage(order.listing),
    commodity: listingCommodityName(order.listing),
    category: listingCommodityCategory(order.listing),
    productLocation: order.listing.location,
    quantity: order.quantity,
    unit: order.unit,
    unitPrice: order.quantity > 0 ? order.totalAmount / order.quantity : order.unitPrice,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    transactionId: order.transactionId,
    trackStage: (order.trackStage ?? 'ORDER_RECEIVED') as OrderTrackStage,
    trackUpdatedAt: order.trackUpdatedAt?.toISOString() ?? null,
    farmerName: `${order.farmer.firstName} ${order.farmer.lastName}`,
    farmerEmail: order.farmer.email,
    farmerPhone: order.farmer.phone,
    farmerLocation: formatUserLocation(order.farmer),
    farmerCountry: order.farmer.country,
    farmerProfilePicture: normalizePublicAssetUrl(order.farmer.profilePicture ?? null),
    farmerVerificationStatus: order.farmer.verificationStatus,
    farmerVerificationTags: formatVerificationTags(order.farmer.verificationTags ?? []),
    farmName: order.farmer.farmerProfile?.farmName ?? null,
    purchaseCount: 1,
    ...escrowFields(order, 'buyer'),
  };
}

export type BuyerPlacedOrderRow = OrderCore & {
  buyerId: string;
  farmerId: string;
  listingId: string;
  farmer: FarmerFields;
};

/**
 * Format each placed order for a buyer into a distinct order card item.
 */
export function groupBuyerPlacedOrders(orders: BuyerPlacedOrderRow[]) {
  return orders.map((order) => ({
    ...formatBuyerPlacedOrder(order),
    id: order.id,
    orderId: order.id,
    purchaseCount: 1,
  }));
}

export const orderInclude = {
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
      verificationTags: { select: verificationTagSelect },
    },
  },
} as const;

export const buyerOrderInclude = {
  listing: {
    include: {
      commodity: { include: { category: true } },
      media: { orderBy: { orderIndex: 'asc' as const } },
    },
  },
  farmer: {
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
      verificationTags: { select: verificationTagSelect },
      farmerProfile: { select: { farmName: true } },
    },
  },
} as const;
