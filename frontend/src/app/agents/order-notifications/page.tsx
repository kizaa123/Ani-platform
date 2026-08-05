"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { AppNotification, isBuyerHandler, isHandler } from "@/lib/types";
import { filterHandlerOrderNotifications } from "@/lib/handlerOrderNotifications";
import { HandlerOrderAlertListItem } from "@/components/HandlerAssignmentCards";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";
import { Icon } from "@/components/icons";

export default function HandlerOrderNotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const entityLabel = user && isBuyerHandler(user.roleId) ? "clients" : "fellows";

  const loadNotifications = useCallback(async () => {
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
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isHandler(user.roleId)) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isHandler(user.roleId)) return;
    loadNotifications();
  }, [user, loadNotifications]);

  const unreadCount = useMemo(
    () => (notifications ?? []).filter((n) => !n.read).length,
    [notifications]
  );

  const openNotification = async (notification: AppNotification) => {
    if (!notification.read) {
      try {
        await api.notifications.markRead(notification.id);
        setNotifications((prev) =>
          (prev ?? []).map((item) =>
            item.id === notification.id ? { ...item, read: true } : item
          )
        );
      } catch {
        /* continue navigation */
      }
    }

    const destination = notification.metadata?.actionUrl ?? notification.link;
    if (destination) router.push(destination);
  };

  const markAllRead = async () => {
    if (!notifications?.some((n) => !n.read)) return;
    setBusy(true);
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return <PageContentSkeleton maxWidth="max-w-3xl" />;
  }

  const items = notifications ?? [];
  const loadingList = notifications === null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <Icon name="chevron-left" className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-brand-900">Order Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Order updates for your assigned {entityLabel}.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy}
            className="btn-outline px-3 py-2 text-xs disabled:opacity-50"
          >
            {busy ? "Updating..." : "Mark all as read"}
          </button>
        )}
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      {loadingList ? (
        <PageContentSkeleton maxWidth="max-w-3xl" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/30 p-10 text-center">
          <p className="text-3xl">📦</p>
          <p className="mt-2 font-semibold text-brand-900">No order notifications</p>
          <p className="mt-1 text-sm text-gray-500">
            New order activity for your {entityLabel} will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((notification) => (
            <HandlerOrderAlertListItem
              key={notification.id}
              notification={notification}
              onOpen={() => openNotification(notification)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
