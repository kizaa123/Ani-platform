"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { AppNotification } from "@/lib/types";
import { formatDate } from "@/lib/format";

const TYPE_ICONS: Record<string, string> = {
  CHAT_MESSAGE: "💬",
  NEW_ORDER: "📦",
  PRODUCT_PURCHASE: "🛒",
  ORDER_TRACKED: "🚚",
  CONNECTION_REQUEST: "🤝",
  CONNECTION_APPROVED: "✅",
  CONNECTION_DECLINED: "❌",
  FARM_ACCESS_PAID: "💰",
};

function BellIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [list, countRes] = await Promise.all([
        api.notifications.list(),
        api.notifications.unreadCount(),
      ]);
      setItems(list);
      setUnread(countRes.count);
    } catch {
      /* ignore polling errors */
    }
  }, [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || loading) return;
    refresh();
    const timer = setInterval(refresh, 25000);
    return () => clearInterval(timer);
  }, [user, loading, refresh]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    refresh();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading || !user) return null;

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api.notifications.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } finally {
      setBusy(false);
    }
  };

  const openNotification = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await api.notifications.markRead(n.id);
        setItems((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        /* continue navigation */
      }
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-brand-200 text-brand-800 transition hover:bg-brand-50 ${className}`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 z-[60] bg-black/40"
              onClick={() => setOpen(false)}
            />

            <aside
              className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-brand-200 bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
            >
              <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-brand-900">Notifications</h2>
                  <p className="text-xs text-gray-500">Messages, orders & financial activity</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {unread > 0 && (
                <div className="border-b border-brand-50 px-5 py-2">
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={busy}
                    className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-60"
                  >
                    Mark all as read
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-gray-500">No notifications yet.</p>
                ) : (
                  <ul className="divide-y divide-brand-50">
                    {items.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(n)}
                          className={`flex w-full gap-3 px-5 py-4 text-left transition hover:bg-brand-50/60 ${
                            !n.read ? "bg-brand-50/40" : ""
                          }`}
                        >
                          <span className="mt-0.5 text-xl shrink-0">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-brand-900">{n.title}</p>
                              {!n.read && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                              )}
                            </div>
                            <p className="mt-1 text-sm leading-snug text-gray-600">{n.body}</p>
                            <p className="mt-2 text-[10px] text-gray-400">{formatDate(n.createdAt)}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-brand-100 p-4 text-center">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-brand-700 hover:underline"
                >
                  Back to dashboard
                </Link>
              </div>
            </aside>
          </>,
          document.body
        )}
    </>
  );
}
