import { api } from "./api";
import type { AppNotification, ProductOrderLineItem } from "./types";

export function parseHandlerOwnerIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const farmMatch = url.match(/\/agents\/farm\/([^/]+)\/orders/);
  if (farmMatch) return farmMatch[1];
  const buyerMatch = url.match(/\/agents\/buyer\/([^/]+)\/orders/);
  if (buyerMatch) return buyerMatch[1];
  return null;
}

function findClientOrder(
  orders: ProductOrderLineItem[],
  opts: {
    orderId?: string | null;
    listingId?: string | null;
    productName?: string | null;
  }
): ProductOrderLineItem | null {
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
      const names = [order.productName, order.orderName]
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

async function resolveFromFinancialStatement(
  notification: AppNotification
): Promise<{ ownerId: string; orderId: string } | null> {
  const productName =
    notification.metadata?.orderName ?? notification.metadata?.actionLabel ?? null;
  if (!productName) return null;

  const statement = await api.agents.financialStatement();
  const pending = statement.pendingDistributions?.find((row) => row.orderName === productName);
  if (pending) {
    return { ownerId: pending.ownerId, orderId: pending.orderId };
  }

  const paymentRows = [
    ...(statement.handlerPayments ?? []),
    ...(statement.transactions ?? []),
  ];
  const payment = paymentRows.find(
    (row) =>
      row.orderId &&
      (row.orderName === productName ||
        row.description.includes(productName) ||
        row.orderName === notification.metadata?.orderName)
  );
  if (payment?.orderId && payment.ownerId) {
    return { ownerId: payment.ownerId, orderId: payment.orderId };
  }

  return null;
}

export async function resolveHandlerOrderFromNotification(
  notification: AppNotification
): Promise<{ order: ProductOrderLineItem; ownerId: string } | null> {
  const meta = notification.metadata;
  let ownerId = meta?.ownerId ?? parseHandlerOwnerIdFromUrl(meta?.actionUrl ?? notification.link);
  let orderId = meta?.orderId ?? null;

  if (
    !ownerId &&
    (meta?.actionUrl === "/agents/financials" || notification.link === "/agents/financials")
  ) {
    const fromStatement = await resolveFromFinancialStatement(notification);
    if (fromStatement) {
      ownerId = fromStatement.ownerId;
      orderId = fromStatement.orderId;
    }
  }

  if (!ownerId) return null;

  const orders = await api.agents.clientOrders(ownerId);
  const order = findClientOrder(orders, {
    orderId,
    listingId: meta?.listingId,
    productName: meta?.orderName ?? meta?.actionLabel,
  });

  if (!order) return null;
  return { order, ownerId };
}
