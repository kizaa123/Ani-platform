"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { assetUrl, assetUrlFallback } from "@/lib/assetUrl";
import { resolveHandlerOrderFromNotification } from "@/lib/handlerOrderFromNotification";
import {
  filterHandlerOrderNotifications,
  formatRelativeTime,
  groupHandlerOrderNotificationsByDate,
  handlerOrderTypeLabel,
} from "@/lib/handlerOrderNotifications";
import type { AppNotification, ProductOrderLineItem } from "@/lib/types";
import { OrderDetailModal, type OrderListPerspective } from "@/components/ProductOrdersList";
import { Icon, NOTIFICATION_ICONS } from "@/components/icons";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";

type FilterMode = "all" | "unread";

function orderProductName(notification: AppNotification) {
  return (
    notification.metadata?.orderName ??
    notification.metadata?.actionLabel ??
    notification.title
  );
}

function orderTotalLabel(notification: AppNotification) {
  if (notification.metadata?.priceLabel) return notification.metadata.priceLabel;
  if (notification.metadata?.price != null) {
    return `GHC ${notification.metadata.price.toFixed(2)}`;
  }
  return null;
}

function ListThumbnail({ notification }: { notification: AppNotification }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageUrl = notification.metadata?.imageUrl;
  const primarySrc = assetUrl(imageUrl);
  const fallbackSrc = assetUrlFallback(imageUrl);
  const src =
    primarySrc && failedSrc !== primarySrc
      ? primarySrc
      : fallbackSrc && failedSrc !== fallbackSrc
        ? fallbackSrc
        : null;
  const iconName = NOTIFICATION_ICONS[notification.type] ?? "package";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-14 w-14 shrink-0 rounded-xl border border-brand-100 object-cover"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">
      <Icon name={iconName} className="h-5 w-5" />
    </span>
  );
}

function CompactOrderAlertRow({
  notification,
  onView,
  busy,
  loading,
}: {
  notification: AppNotification;
  onView: () => void;
  busy: boolean;
  loading: boolean;
}) {
  const productName = orderProductName(notification);
  const totalLabel = orderTotalLabel(notification);
  const typeLabel = handlerOrderTypeLabel(notification.type);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
        notification.read ? "" : "bg-amber-50/40"
      }`}
    >
      <ListThumbnail notification={notification} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <p className="line-clamp-1 flex-1 text-sm font-semibold text-brand-900">{productName}</p>
          {!notification.read && (
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{notification.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
          <span className="rounded bg-gray-100 px-1 py-0.5 font-semibold text-gray-700">
            {typeLabel}
          </span>
          {totalLabel && <span className="font-semibold text-brand-700">{totalLabel}</span>}
          <span>{formatRelativeTime(notification.createdAt)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onView}
        disabled={busy || loading}
        className="shrink-0 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
      >
        {loading ? "Loading…" : "View"}
      </button>
    </div>
  );
}

export function HandlerOrderNotificationsPanel({
  entityLabel,
  orderPerspective,
}: {
  entityLabel: "fellows" | "clients";
  orderPerspective: OrderListPerspective;
}) {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [busy, setBusy] = useState(false);
  const [loadingNotificationId, setLoadingNotificationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [orderLoadError, setOrderLoadError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ProductOrderLineItem | null>(null);
  const [modalOwnerId, setModalOwnerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.notifications.list();
      setNotifications(filterHandlerOrderNotifications(list));
      setError("");
    } catch (e) {
      setNotifications([]);
      setError(e instanceof Error ? e.message : "Failed to load order notifications");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const items = notifications ?? [];
    return filter === "unread" ? items.filter((n) => !n.read) : items;
  }, [notifications, filter]);

  const grouped = useMemo(() => groupHandlerOrderNotificationsByDate(filtered), [filtered]);
  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    } finally {
      setBusy(false);
    }
  };

  const openOrderModal = async (notification: AppNotification) => {
    setLoadingNotificationId(notification.id);
    setOrderLoadError("");

    if (!notification.read) {
      try {
        await api.notifications.markRead(notification.id);
        setNotifications((prev) =>
          (prev ?? []).map((item) =>
            item.id === notification.id ? { ...item, read: true } : item
          )
        );
      } catch {
        /* continue opening modal */
      }
    }

    try {
      const resolved = await resolveHandlerOrderFromNotification(notification);
      if (!resolved) {
        setOrderLoadError("Could not load order details for this notification.");
        return;
      }
      setModalOwnerId(resolved.ownerId);
      setSelectedOrder(resolved.order);
    } catch (e) {
      setOrderLoadError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoadingNotificationId(null);
    }
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
    setModalOwnerId(null);
  };

  if (notifications === null) {
    return <PageContentSkeleton maxWidth="max-w-3xl" />;
  }

  return (
    <>
      <article className="card-elevated mx-auto w-full max-w-3xl overflow-hidden rounded-xl">
        <div className="border-b border-brand-100 bg-brand-50/50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
                <Icon name="package" className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-brand-900">Order Notifications</h1>
                <p className="truncate text-[11px] text-gray-500">
                  Order updates for your assigned {entityLabel}.
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-800">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-brand-50 px-3 py-2">
          <div className="inline-flex rounded-lg border border-brand-100 bg-white p-0.5">
            {(["all", "unread"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold capitalize transition ${
                  filter === mode
                    ? "bg-brand-700 text-white"
                    : "text-brand-800 hover:bg-brand-50"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={busy}
              className="text-[10px] font-semibold text-brand-700 hover:underline disabled:opacity-60"
            >
              Mark all read
            </button>
          )}
        </div>

        {error && (
          <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        {orderLoadError && (
          <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {orderLoadError}
          </p>
        )}

        <div className="p-3">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">
              {filter === "unread"
                ? `No unread order notifications for your ${entityLabel}`
                : `No order notifications for your ${entityLabel} yet`}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <p className="px-1 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((notification) => (
                    <CompactOrderAlertRow
                      key={notification.id}
                      notification={notification}
                      onView={() => openOrderModal(notification)}
                      busy={busy}
                      loading={loadingNotificationId === notification.id}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          perspective={orderPerspective}
          trackEditable={orderPerspective === "farmer"}
          handlerOwnerId={modalOwnerId ?? undefined}
          onClose={closeOrderModal}
          onTrackUpdated={(updated) => {
            setSelectedOrder((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
        />
      )}
    </>
  );
}
