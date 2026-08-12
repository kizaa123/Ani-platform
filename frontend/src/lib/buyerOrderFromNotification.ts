import { api } from "./api";
import type { AppNotification, BuyerOrderLineItem, OrderDetail } from "./types";

function parseOrderIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get("order");
  } catch {
    const match = url.match(/[?&]order=([^&]+)/);
    return match?.[1] ?? null;
  }
}

function extractQuotedProductName(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/"([^"]+)"/);
  return match?.[1]?.trim() ?? null;
}

function orderDetailToBuyerLineItem(detail: OrderDetail): BuyerOrderLineItem {
  return {
    id: detail.id,
    orderId: detail.id,
    buyerId: detail.buyerId,
    farmerId: detail.farmerId,
    listingId: detail.listingId,
    date: detail.createdAt,
    productName: detail.productName,
    commodity: "Product",
    category: "Marketplace",
    quantity: detail.quantity,
    unit: detail.unit,
    unitPrice: detail.unitPrice,
    totalAmount: detail.totalAmount,
    status: detail.status,
    paymentMethod: detail.paymentMethod,
    transactionId: detail.transactionId,
    trackStage: detail.trackStage,
    trackUpdatedAt: detail.trackUpdatedAt,
    farmerName: detail.farmerName,
    farmerPhone: "-",
    farmerLocation: "-",
    purchaseCount: 1,
    escrowStatus: detail.escrowStatus,
    otpVerifiedAt: detail.otpVerifiedAt,
    paymentReleasedAt: detail.paymentReleasedAt,
    canRelease: detail.canRelease,
    releaseOtp: detail.releaseOtp,
    counterpartHandler: detail.counterpartHandler,
  };
}

function findBuyerOrder(
  orders: BuyerOrderLineItem[],
  opts: {
    orderId?: string | null;
    listingId?: string | null;
    productName?: string | null;
  }
): BuyerOrderLineItem | null {
  const { orderId, listingId, productName } = opts;

  if (orderId) {
    const byId = orders.find((order) => order.orderId === orderId || order.id === orderId);
    if (byId) return byId;
  }

  if (listingId) {
    const matches = orders.filter((order) => order.listingId === listingId);
    if (matches.length > 0) {
      return matches.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
    }
  }

  if (productName) {
    const normalized = productName.trim().toLowerCase();
    const exact = orders.filter((order) => {
      const names = [order.productName, order.title]
        .filter(Boolean)
        .map((name) => name!.toLowerCase());
      return names.includes(normalized);
    });
    if (exact.length > 0) {
      return exact.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
    }

    const partial = orders.filter((order) => {
      const names = [order.productName, order.title]
        .filter(Boolean)
        .map((name) => name!.toLowerCase());
      return names.some((name) => name.includes(normalized) || normalized.includes(name));
    });
    if (partial.length > 0) {
      return partial.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
    }
  }

  return null;
}

export function orderIdFromNotification(notification: AppNotification): string | null {
  const meta = notification.metadata;
  return (
    meta?.orderId ??
    parseOrderIdFromUrl(meta?.actionUrl ?? notification.link ?? undefined)
  );
}

export async function resolveBuyerOrderFromNotification(
  notification: AppNotification
): Promise<BuyerOrderLineItem | null> {
  const meta = notification.metadata;
  const orderId = orderIdFromNotification(notification);
  const productName =
    meta?.orderName ??
    meta?.actionLabel ??
    extractQuotedProductName(notification.body) ??
    extractQuotedProductName(notification.title);

  if (orderId) {
    try {
      const detail = await api.orders.get(orderId);
      return orderDetailToBuyerLineItem(detail);
    } catch {
      /* fall through to list matching */
    }
  }

  const orders = await api.buyer.orders();
  const fromList = findBuyerOrder(orders, {
    orderId,
    listingId: meta?.listingId,
    productName,
  });
  if (fromList) return fromList;

  return null;
}
