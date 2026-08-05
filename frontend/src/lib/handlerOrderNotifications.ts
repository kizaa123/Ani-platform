import type { AppNotification } from "./types";

export const HANDLER_ORDER_NOTIFICATION_TYPES = new Set([
  "NEW_ORDER",
  "ORDER_TRACKED",
  "ORDER_PAYMENT_RELEASED",
  "MONEY_DISTRIBUTED",
]);

export function isHandlerOrderNotification(notification: AppNotification): boolean {
  return HANDLER_ORDER_NOTIFICATION_TYPES.has(notification.type);
}

export function sortHandlerOrderNotifications(notifications: AppNotification[]): AppNotification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function filterHandlerOrderNotifications(notifications: AppNotification[]): AppNotification[] {
  return sortHandlerOrderNotifications(notifications.filter(isHandlerOrderNotification));
}
