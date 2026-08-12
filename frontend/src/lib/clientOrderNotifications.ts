import type { AppNotification } from "./types";

export const CLIENT_ORDER_NOTIFICATION_TYPES = new Set([
  "PRODUCT_PURCHASE",
  "ORDER_TRACKED",
  "ORDER_PAYMENT_RELEASED",
]);

export function isClientOrderNotification(notification: AppNotification): boolean {
  return CLIENT_ORDER_NOTIFICATION_TYPES.has(notification.type);
}
