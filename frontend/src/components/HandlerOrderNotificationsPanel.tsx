"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { assetUrl, assetUrlFallback } from "@/lib/assetUrl";
import {
  filterHandlerOrderNotifications,
  formatRelativeTime,
  groupHandlerOrderNotificationsByDate,
  handlerOrderTypeLabel,
} from "@/lib/handlerOrderNotifications";
import type { AppNotification } from "@/lib/types";
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

function notificationDestination(notification: AppNotification) {
  return notification.metadata?.actionUrl ?? notification.link ?? null;
}

function DetailThumbnail({ notification }: { notification: AppNotification }) {
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
        className="h-28 w-full rounded-xl border border-brand-100 object-cover sm:h-36"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div className="flex h-28 w-full items-center justify-center rounded-xl border border-brand-100 bg-brand-50 sm:h-36">
      <Icon name={iconName} className="h-10 w-10 text-brand-700" />
    </div>
  );
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
        className="h-10 w-10 shrink-0 rounded-lg border border-brand-100 object-cover"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
      <Icon name={iconName} className="h-4 w-4" />
    </span>
  );
}

function OrderNotificationDetail({
  notification,
  onOpen,
  busy,
}: {
  notification: AppNotification;
  onOpen: () => void;
  busy: boolean;
}) {
  const productName = orderProductName(notification);
  const totalLabel = orderTotalLabel(notification);
  const quantity = notification.metadata?.quantity;
  const unit = notification.metadata?.unit;
  const destination = notificationDestination(notification);
  const typeLabel = handlerOrderTypeLabel(notification.type);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-brand-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-800">
            {typeLabel}
          </span>
          {!notification.read && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              Unread
            </span>
          )}
        </div>
        <h2 className="mt-3 text-xl font-bold text-brand-900">{notification.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <DetailThumbnail notification={notification} />

        <p className="mt-4 text-lg font-semibold text-brand-900">{productName}</p>
        {notification.body && (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{notification.body}</p>
        )}

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {quantity != null && unit && (
            <div className="rounded-lg bg-gray-50 px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Quantity
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-brand-900">
                {quantity} {unit}
              </dd>
            </div>
          )}
          {totalLabel && (
            <div className="rounded-lg bg-brand-50 px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                Amount
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-brand-900">{totalLabel}</dd>
            </div>
          )}
          {notification.metadata?.farmerName && (
            <div className="rounded-lg bg-gray-50 px-3 py-2.5 sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Fellow / production
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-brand-900">
                {notification.metadata.farmerName}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {destination && (
        <div className="border-t border-brand-100 px-5 py-4">
          <button
            type="button"
            onClick={onOpen}
            disabled={busy}
            className="btn-primary w-full py-2.5 text-sm disabled:opacity-60"
          >
            {notification.metadata?.actionLabel ?? "View order"}
          </button>
        </div>
      )}
    </div>
  );
}

export function HandlerOrderNotificationsPanel({
  entityLabel,
}: {
  entityLabel: "fellows" | "clients";
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await api.notifications.list();
      const orderAlerts = filterHandlerOrderNotifications(list);
      setNotifications(orderAlerts);
      setError("");
      setSelectedId((current) => {
        if (current && orderAlerts.some((n) => n.id === current)) return current;
        return orderAlerts[0]?.id ?? null;
      });
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
  const selected = filtered.find((n) => n.id === selectedId) ?? null;
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

  const openNotification = async (notification: AppNotification) => {
    setSelectedId(notification.id);
    const destination = notificationDestination(notification);

    if (!notification.read) {
      setBusy(true);
      try {
        await api.notifications.markRead(notification.id);
        setNotifications((prev) =>
          (prev ?? []).map((item) =>
            item.id === notification.id ? { ...item, read: true } : item
          )
        );
      } finally {
        setBusy(false);
      }
    }

    if (destination) router.push(destination);
  };

  if (notifications === null) {
    return <PageContentSkeleton maxWidth="max-w-6xl" />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-brand-200 bg-white p-1">
          {(["all", "unread"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === mode
                  ? "bg-brand-700 text-white shadow-sm"
                  : "text-brand-800 hover:bg-brand-50"
              }`}
            >
              {mode}
              {mode === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy}
            className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-60"
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/30 p-10 text-center">
          <p className="text-3xl">📦</p>
          <p className="mt-2 font-semibold text-brand-900">
            {filter === "unread" ? "No unread order updates" : "No order updates yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "unread"
              ? "You're caught up on order activity for your assigned " + entityLabel + "."
              : "Updates about orders from your assigned " + entityLabel + " will appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
          <div className="grid min-h-[28rem] lg:grid-cols-[minmax(0,22rem)_1fr]">
            <div className="border-b border-brand-100 lg:border-b-0 lg:border-r">
              <div className="max-h-[32rem] overflow-y-auto lg:max-h-[36rem]">
                {grouped.map((group) => (
                  <div key={group.label}>
                    <p className="sticky top-0 z-10 border-b border-brand-50 bg-brand-50/95 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-700 backdrop-blur-sm">
                      {group.label}
                    </p>
                    <ul>
                      {group.items.map((notification) => {
                        const isSelected = notification.id === selectedId;
                        const productName = orderProductName(notification);
                        const totalLabel = orderTotalLabel(notification);
                        const typeLabel = handlerOrderTypeLabel(notification.type);

                        return (
                          <li key={notification.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(notification.id)}
                              className={`flex w-full items-start gap-3 border-b border-brand-50 px-4 py-3 text-left transition hover:bg-brand-50/60 ${
                                isSelected ? "bg-brand-50" : ""
                              }`}
                            >
                              <span
                                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                                  notification.read ? "bg-transparent" : "bg-amber-500"
                                }`}
                                aria-hidden
                              />
                              <ListThumbnail notification={notification} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-1 text-sm font-semibold text-brand-900">
                                    {productName}
                                  </p>
                                  <span className="shrink-0 text-[11px] text-gray-400">
                                    {formatRelativeTime(notification.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                                  {notification.title}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                                    {typeLabel}
                                  </span>
                                  {totalLabel && (
                                    <span className="text-[11px] font-semibold text-brand-700">
                                      {totalLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden min-h-[28rem] bg-white lg:block">
              {selected ? (
                <OrderNotificationDetail
                  notification={selected}
                  onOpen={() => openNotification(selected)}
                  busy={busy}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
                  Select an update to view details
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div className="border-t border-brand-100 bg-brand-50/40 p-4 lg:hidden">
              <OrderNotificationDetail
                notification={selected}
                onOpen={() => openNotification(selected)}
                busy={busy}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
