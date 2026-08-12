import { api } from "./api";
import type { AppNotification, BuyerOrderLineItem } from "./types";

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
    return orders.find((order) => order.orderId === orderId || order.id === orderId) ?? null;
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
    const matches = orders.filter((order) => {
      const names = [order.productName, order.title]
        .filter(Boolean)
        .map((name) => name!.toLowerCase());
      return names.includes(normalized);
    });
    if (matches.length > 0) {
      return matches.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
    }
  }

  return null;
}

export async function resolveBuyerOrderFromNotification(
  notification: AppNotification
): Promise<BuyerOrderLineItem | null> {
  const meta = notification.metadata;
  const orderId =
    meta?.orderId ??
    parseOrderIdFromUrl(meta?.actionUrl ?? notification.link ?? undefined);

  const orders = await api.buyer.orders();
  return findBuyerOrder(orders, {
    orderId,
    listingId: meta?.listingId,
    productName: meta?.orderName ?? meta?.actionLabel,
  });
}
