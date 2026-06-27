import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { maxTrackStage, type OrderTrackStage } from '../constants/orderTrack';

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
  farmerProfile: { farmName: string } | null;
};

type ListingFields = {
  title: string;
  location: string | null;
  images: unknown;
  commodity: { name: string; category: { name: string } };
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
  return user.address?.trim() || '—';
}

function productImage(listing: ListingFields): string | null {
  const images = normalizeImages(listing.images).map((img) => normalizePublicAssetUrl(img) ?? img);
  return images[0] ?? null;
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
    commodity: order.listing.commodity.name,
    category: order.listing.commodity.category.name,
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
    purchaseCount: 1,
  };
}

/**
 * Combine repeated purchases of the same product by the same buyer into one row.
 * Used on farmer/handler order pages and financial statement sales.
 */
export function groupFarmerIncomingOrders(orders: FarmerIncomingOrderRow[]) {
  type Group = FarmerIncomingOrderRow & { purchaseCount: number };

  const groups = new Map<string, Group>();

  for (const order of orders) {
    const key = `${order.buyerId}:${order.listingId}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { ...order, purchaseCount: 1 });
      continue;
    }

    existing.quantity += order.quantity;
    existing.totalAmount += order.totalAmount;
    existing.purchaseCount += 1;
    existing.trackStage = maxTrackStage(
      existing.trackStage ?? 'ORDER_RECEIVED',
      order.trackStage ?? 'ORDER_RECEIVED'
    );

    if (order.createdAt > existing.createdAt) {
      existing.createdAt = order.createdAt;
      existing.paymentMethod = order.paymentMethod;
      existing.transactionId = order.transactionId;
    }

    if (
      order.trackUpdatedAt &&
      (!existing.trackUpdatedAt || order.trackUpdatedAt > existing.trackUpdatedAt)
    ) {
      existing.trackUpdatedAt = order.trackUpdatedAt;
    }

    if (existing.status !== order.status) {
      existing.status = 'PENDING';
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((order) => ({
      ...formatFarmerIncomingOrder(order),
      id: `${order.buyerId}-${order.listingId}`,
      purchaseCount: order.purchaseCount,
    }));
}

/** Orders placed by a buyer (farmer details shown). */
export function formatBuyerPlacedOrder(
  order: OrderCore & { buyerId: string; listingId: string; farmer: FarmerFields }
) {
  return {
    id: order.id,
    buyerId: order.buyerId,
    listingId: order.listingId,
    date: order.createdAt.toISOString(),
    productName: order.listing.title,
    productImage: productImage(order.listing),
    commodity: order.listing.commodity.name,
    category: order.listing.commodity.category.name,
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
    farmName: order.farmer.farmerProfile?.farmName ?? null,
    purchaseCount: 1,
  };
}

export type BuyerPlacedOrderRow = OrderCore & {
  buyerId: string;
  listingId: string;
  farmer: FarmerFields;
};

/**
 * Combine repeated purchases of the same product by the same buyer into one row.
 * Used on the buyer orders page.
 */
export function groupBuyerPlacedOrders(orders: BuyerPlacedOrderRow[]) {
  type Group = BuyerPlacedOrderRow & { purchaseCount: number };

  const groups = new Map<string, Group>();

  for (const order of orders) {
    const key = `${order.buyerId}:${order.listingId}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { ...order, purchaseCount: 1 });
      continue;
    }

    existing.quantity += order.quantity;
    existing.totalAmount += order.totalAmount;
    existing.purchaseCount += 1;
    existing.trackStage = maxTrackStage(
      existing.trackStage ?? 'ORDER_RECEIVED',
      order.trackStage ?? 'ORDER_RECEIVED'
    );

    if (order.createdAt > existing.createdAt) {
      existing.createdAt = order.createdAt;
      existing.paymentMethod = order.paymentMethod;
      existing.transactionId = order.transactionId;
    }

    if (
      order.trackUpdatedAt &&
      (!existing.trackUpdatedAt || order.trackUpdatedAt > existing.trackUpdatedAt)
    ) {
      existing.trackUpdatedAt = order.trackUpdatedAt;
    }

    if (existing.status !== order.status) {
      existing.status = 'PENDING';
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((order) => ({
      ...formatBuyerPlacedOrder(order),
      id: `${order.buyerId}-${order.listingId}`,
      purchaseCount: order.purchaseCount,
    }));
}

export const orderInclude = {
  listing: { include: { commodity: { include: { category: true } } } },
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
} as const;

export const buyerOrderInclude = {
  listing: { include: { commodity: { include: { category: true } } } },
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
      farmerProfile: { select: { farmName: true } },
    },
  },
} as const;
