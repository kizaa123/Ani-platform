import { isAdmin, isHandler } from "./types";
import type { AppNotification } from "./types";
import {
  HANDLER_ORDER_NOTIFICATION_TYPES,
  isHandlerOrderNotification,
} from "./handlerOrderNotifications";

const ADMIN_NOTIFICATION_DESTINATIONS: Record<string, string> = {
  NEW_ACCOUNTANT_REGISTRATION: "/admin/staff",
  CONNECTION_REQUEST: "/connections",
  CHAT_MESSAGE: "/connections",
};

export function getNotificationDestination(
  notification: AppNotification,
  roleId?: number
): string | null {
  const fallback = notification.metadata?.actionUrl ?? notification.link ?? null;

  if (roleId !== undefined && isAdmin(roleId)) {
    const adminDestination = ADMIN_NOTIFICATION_DESTINATIONS[notification.type];
    if (adminDestination) return adminDestination;
    return fallback;
  }

  if (roleId === undefined || !isHandler(roleId) || !isHandlerOrderNotification(notification)) {
    return fallback;
  }

  if (notification.type === "MONEY_DISTRIBUTED") {
    return fallback ?? "/agents/financials";
  }

  if (HANDLER_ORDER_NOTIFICATION_TYPES.has(notification.type)) {
    return "/agents/order-notifications";
  }

  return fallback;
}
