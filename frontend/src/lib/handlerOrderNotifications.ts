import { formatDate } from "./format";
import type { AppNotification } from "./types";

export const HANDLER_ORDER_NOTIFICATION_TYPES = new Set([
  "NEW_ORDER",
  "ORDER_TRACKED",
  "ORDER_PAYMENT_RELEASED",
  "MONEY_DISTRIBUTED",
  "PRODUCT_PURCHASE",
]);

export const HANDLER_ORDER_TYPE_LABELS: Record<string, string> = {
  NEW_ORDER: "New order",
  ORDER_TRACKED: "In transit",
  ORDER_PAYMENT_RELEASED: "Payment released",
  MONEY_DISTRIBUTED: "Commission paid",
  PRODUCT_PURCHASE: "Purchase",
};

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

export function filterUnreadHandlerOrderNotifications(notifications: AppNotification[]): AppNotification[] {
  return filterHandlerOrderNotifications(notifications).filter((n) => !n.read);
}

export function handlerOrderTypeLabel(type: string): string {
  return HANDLER_ORDER_TYPE_LABELS[type] ?? type.replace(/_/g, " ").toLowerCase();
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export type HandlerOrderDateGroup = {
  label: string;
  items: AppNotification[];
};

export function groupHandlerOrderNotificationsByDate(
  notifications: AppNotification[]
): HandlerOrderDateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const buckets = new Map<string, AppNotification[]>();
  const order = ["Today", "Yesterday", "This week", "Earlier"];

  for (const notification of notifications) {
    const day = new Date(notification.createdAt);
    day.setHours(0, 0, 0, 0);

    let label: string;
    if (day.getTime() === today.getTime()) label = "Today";
    else if (day.getTime() === yesterday.getTime()) label = "Yesterday";
    else if (day >= weekAgo) label = "This week";
    else label = "Earlier";

    const list = buckets.get(label) ?? [];
    list.push(notification);
    buckets.set(label, list);
  }

  return order
    .filter((label) => (buckets.get(label)?.length ?? 0) > 0)
    .map((label) => ({ label, items: buckets.get(label)! }));
}
