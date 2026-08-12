"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { AppNotification, BuyerOrderLineItem, canPurchaseFromMarketplace } from "@/lib/types";
import { getNotificationDestination } from "@/lib/notificationNavigation";
import { NotificationToastStack } from "@/components/NotificationToastStack";
import { OrderDetailModal } from "@/components/ProductOrdersList";
import { isClientOrderNotification } from "@/lib/clientOrderNotifications";
import { resolveBuyerOrderFromNotification } from "@/lib/buyerOrderFromNotification";

export type NotificationToastItem = {
  toastId: string;
  notification: AppNotification;
  /** Auto-dismiss duration; catch-up uses 3s, live uses 5s. */
  autoDismissMs?: number;
};

type NotificationContextValue = {
  items: AppNotification[];
  unread: number;
  busy: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  openNotification: (n: AppNotification) => Promise<void>;
  setToastsEnabled: (enabled: boolean) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

/** Enable live notification popups while a portal layout is mounted. */
export function useEnableNotificationToasts() {
  const { setToastsEnabled } = useNotifications();

  useEffect(() => {
    setToastsEnabled(true);
    return () => setToastsEnabled(false);
  }, [setToastsEnabled]);
}

const POLL_MS = 25000;
const PORTAL_POLL_MS = 12000;
const LIVE_MAX_TOASTS = 3;
const LIVE_AUTO_DISMISS_MS = 4000;
const CATCHUP_AUTO_DISMISS_MS = 3000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<NotificationToastItem[]>([]);
  const [toastsEnabled, setToastsEnabledState] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrderLineItem | null>(null);
  const [orderLoadError, setOrderLoadError] = useState("");

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const catchUpQueueRef = useRef<AppNotification[]>([]);
  const catchUpActiveRef = useRef(false);
  const catchUpInitializedRef = useRef(false);
  const catchUpShownRef = useRef<Set<string>>(new Set());

  const makeToastItem = useCallback(
    (notification: AppNotification, autoDismissMs: number): NotificationToastItem => ({
      toastId: `${notification.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      notification,
      autoDismissMs,
    }),
    []
  );

  const showNextCatchUpToast = useCallback(() => {
    const next = catchUpQueueRef.current.shift();
    if (!next) {
      catchUpActiveRef.current = false;
      setToasts([]);
      return;
    }
    catchUpShownRef.current.add(next.id);
    catchUpActiveRef.current = true;
    setToasts([makeToastItem(next, CATCHUP_AUTO_DISMISS_MS)]);
  }, [makeToastItem]);

  const enqueueCatchUp = useCallback(
    (notifications: AppNotification[]) => {
      const fresh = notifications.filter(
        (n) => !n.read && !catchUpShownRef.current.has(n.id)
      );
      if (fresh.length === 0) return;

      const sorted = [...fresh].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const existingIds = new Set(catchUpQueueRef.current.map((n) => n.id));
      for (const notification of sorted) {
        if (!existingIds.has(notification.id)) {
          catchUpQueueRef.current.push(notification);
          existingIds.add(notification.id);
        }
      }

      if (!catchUpActiveRef.current) {
        showNextCatchUpToast();
      }
    },
    [showNextCatchUpToast]
  );

  const setToastsEnabled = useCallback(
    (enabled: boolean) => {
      setToastsEnabledState(enabled);
      if (!enabled) {
        setToasts([]);
        return;
      }
      if (catchUpQueueRef.current.length > 0 && !catchUpActiveRef.current) {
        showNextCatchUpToast();
      }
    },
    [showNextCatchUpToast]
  );

  const dismissToast = useCallback(
    (toastId: string) => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
      if (catchUpActiveRef.current) {
        window.setTimeout(() => showNextCatchUpToast(), 280);
      }
    },
    [showNextCatchUpToast]
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [list, countRes] = await Promise.all([
        api.notifications.list(),
        api.notifications.unreadCount(),
      ]);

      const seenBefore = seenIdsRef.current;
      const newOnes =
        initializedRef.current
          ? list.filter((n) => !seenBefore.has(n.id))
          : [];

      list.forEach((n) => seenIdsRef.current.add(n.id));
      initializedRef.current = true;

      setItems(list);
      setUnread(countRes.count);

      if (toastsEnabled) {
        if (catchUpActiveRef.current || catchUpQueueRef.current.length > 0) {
          const newUnread = newOnes.filter((n) => !n.read);
          if (newUnread.length > 0) enqueueCatchUp(newUnread);
        } else if (newOnes.length > 0) {
          const sorted = [...newOnes].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setToasts((prev) => {
            const incoming = sorted.map((notification) =>
              makeToastItem(notification, LIVE_AUTO_DISMISS_MS)
            );
            return [...incoming, ...prev].slice(0, LIVE_MAX_TOASTS);
          });
        }
      }
    } catch {
      /* ignore polling errors */
    }
  }, [user, toastsEnabled, enqueueCatchUp, makeToastItem]);

  useEffect(() => {
    if (!user || loading) {
      seenIdsRef.current = new Set();
      initializedRef.current = false;
      catchUpQueueRef.current = [];
      catchUpActiveRef.current = false;
      catchUpInitializedRef.current = false;
      catchUpShownRef.current = new Set();
      setItems([]);
      setUnread(0);
      setToasts([]);
      return;
    }
    refresh();
    const interval = toastsEnabled ? PORTAL_POLL_MS : POLL_MS;
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [user, loading, refresh, toastsEnabled]);

  useEffect(() => {
    if (!toastsEnabled || !user || catchUpInitializedRef.current) return;

    const startCatchUp = (list: AppNotification[]) => {
      catchUpInitializedRef.current = true;
      const unreadOnLogin = list.filter((n) => !n.read);
      if (unreadOnLogin.length > 0) {
        enqueueCatchUp(unreadOnLogin);
      }
    };

    if (items.length > 0) {
      startCatchUp(items);
      return;
    }

    api.notifications
      .list()
      .then(startCatchUp)
      .catch(() => {
        catchUpInitializedRef.current = true;
      });
  }, [toastsEnabled, user, items, enqueueCatchUp]);

  useEffect(() => {
    if (!panelOpen) return;
    document.body.style.overflow = "hidden";
    refresh();
    return () => {
      document.body.style.overflow = "";
    };
  }, [panelOpen, refresh]);

  const markAllRead = useCallback(async () => {
    setBusy(true);
    try {
      await api.notifications.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } finally {
      setBusy(false);
    }
  }, []);

  const markNotificationRead = useCallback(async (n: AppNotification) => {
    if (n.read) return;
    try {
      await api.notifications.markRead(n.id);
      setItems((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      );
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      /* continue */
    }
  }, []);

  const openNotification = useCallback(
    async (n: AppNotification) => {
      if (!user) return;
      await markNotificationRead(n);
      setPanelOpen(false);
      setOrderLoadError("");

      if (canPurchaseFromMarketplace(user.roleId) && isClientOrderNotification(n)) {
        try {
          const order = await resolveBuyerOrderFromNotification(n);
          if (order) {
            setSelectedOrder(order);
            return;
          }
          setOrderLoadError("Could not load this order. Opening My Orders instead.");
        } catch {
          setOrderLoadError("Could not load this order. Opening My Orders instead.");
        }
      }

      const destination = getNotificationDestination(n, user.roleId);
      if (destination) router.push(destination);
    },
    [user, router, markNotificationRead]
  );

  const closeOrderModal = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  useEffect(() => {
    if (!orderLoadError) return;
    const timer = window.setTimeout(() => setOrderLoadError(""), 6000);
    return () => window.clearTimeout(timer);
  }, [orderLoadError]);

  const value: NotificationContextValue = {
    items,
    unread,
    busy,
    panelOpen,
    setPanelOpen,
    refresh,
    markAllRead,
    openNotification,
    setToastsEnabled,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toastsEnabled && user && (
        <NotificationToastStack
          toasts={toasts}
          onDismiss={dismissToast}
          onOpen={openNotification}
        />
      )}
      {orderLoadError && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[90] flex justify-center px-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 shadow-sm">
            {orderLoadError}
          </p>
        </div>
      )}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          perspective="buyer"
          onClose={closeOrderModal}
          onTrackUpdated={(updated) => {
            setSelectedOrder((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
        />
      )}
    </NotificationContext.Provider>
  );
}
