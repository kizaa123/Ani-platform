"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
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
        className="h-9 w-9 shrink-0 rounded-lg border border-brand-100 object-cover"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
      <Icon name={iconName} className="h-3.5 w-3.5" />
    </span>
  );
}

function CompactOrderAlertRow({
  notification,
  onView,
  busy,
}: {
  notification: AppNotification;
  onView: () => void;
  busy: boolean;
}) {
  const productName = orderProductName(notification);
  const totalLabel = orderTotalLabel(notification);
  const typeLabel = handlerOrderTypeLabel(notification.type);
  const hasDestination = Boolean(notificationDestination(notification));

  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-2 py-2 ${
        notification.read ? "" : "bg-amber-50/40"
      }`}
    >
      <ListThumbnail notification={notification} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <p className="line-clamp-1 flex-1 text-xs font-semibold text-brand-900">{productName}</p>
          {!notification.read && (
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">{notification.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500">
          <span className="rounded bg-gray-100 px-1 py-0.5 font-semibold text-gray-700">
            {typeLabel}
          </span>
          {totalLabel && <span className="font-semibold text-brand-700">{totalLabel}</span>}
          <span>{formatRelativeTime(notification.createdAt)}</span>
        </div>
      </div>
      {hasDestination && (
        <button
          type="button"
          onClick={onView}
          disabled={busy}
          className="shrink-0 rounded-lg bg-brand-700 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
        >
          View
        </button>
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
  const [filter, setFilter] = useState<FilterMode>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const openNotification = async (notification: AppNotification) => {
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
    return <PageContentSkeleton maxWidth="max-w-md" />;
  }

  return (
    <article className="card-elevated mx-auto max-w-md overflow-hidden rounded-xl">
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

      <div className="max-h-[32rem] overflow-y-auto p-2">
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
                    onView={() => openNotification(notification)}
                    busy={busy}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
