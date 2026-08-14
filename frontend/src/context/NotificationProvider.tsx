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
  /** Fetch latest notifications and show new ones as 4s live toasts (e.g. after placing an order). */
  showLiveNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
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
const LIVE_NOTIFICATION_MAX_AGE_MS = 60_000;
const LIVE_NOTIFICATION_RETRY_MS = 400;
const LIVE_NOTIFICATION_RETRIES = 3;

function isRecentlyCreatedNotification(notification: AppNotification) {
  return Date.now() - new Date(notification.createdAt).getTime() < LIVE_NOTIFICATION_MAX_AGE_MS;
}

function catchUpSessionKey(userId: string) {
  return `co-notif-catchup:${userId}`;
}

function isCatchUpDoneForSession(userId: string) {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(catchUpSessionKey(userId)) === "1";
}

function markCatchUpDoneForSession(userId: string) {
  sessionStorage.setItem(catchUpSessionKey(userId), "1");
}

function catchUpShownStorageKey(userId: string) {
  return `co-notif-catchup-shown:${userId}`;
}

function loadCatchUpShownIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(catchUpShownStorageKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveCatchUpShownIds(userId: string, ids: Set<string>) {
  sessionStorage.setItem(catchUpShownStorageKey(userId), JSON.stringify([...ids]));
}

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

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const catchUpQueueRef = useRef<AppNotification[]>([]);
  const catchUpActiveRef = useRef(false);
  const catchUpInitializedRef = useRef(false);
  const catchUpShownRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

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
    const userId = userIdRef.current;
    if (userId) saveCatchUpShownIds(userId, catchUpShownRef.current);
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

  const pushLiveToasts = useCallback(
    (notifications: AppNotification[]) => {
      if (!toastsEnabled || notifications.length === 0) return;
      const sorted = [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setToasts((prev) => {
        const incoming = sorted.map((notification) =>
          makeToastItem(notification, LIVE_AUTO_DISMISS_MS)
        );
        return [...incoming, ...prev].slice(0, LIVE_MAX_TOASTS);
      });
    },
    [toastsEnabled, makeToastItem]
  );

  const diffNewNotifications = useCallback((list: AppNotification[]) => {
    const seenBefore = seenIdsRef.current;
    const newOnes = initializedRef.current ? list.filter((n) => !seenBefore.has(n.id)) : [];
    list.forEach((n) => seenIdsRef.current.add(n.id));
    initializedRef.current = true;
    return newOnes;
  }, []);

  const showLiveNotifications = useCallback(async () => {
    if (!user) return;
    try {
      let newOnes: AppNotification[] = [];
      for (let attempt = 0; attempt <= LIVE_NOTIFICATION_RETRIES; attempt += 1) {
        const [list, countRes] = await Promise.all([
          api.notifications.list(),
          api.notifications.unreadCount(),
        ]);
        newOnes = diffNewNotifications(list);
        setItems(list);
        setUnread(countRes.count);
        if (newOnes.length > 0) break;
        if (attempt < LIVE_NOTIFICATION_RETRIES) {
          await new Promise((resolve) => window.setTimeout(resolve, LIVE_NOTIFICATION_RETRY_MS));
        }
      }
      pushLiveToasts(newOnes);
    } catch {
      /* ignore */
    }
  }, [user, diffNewNotifications, pushLiveToasts]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [list, countRes] = await Promise.all([
        api.notifications.list(),
        api.notifications.unreadCount(),
      ]);

      const newOnes = diffNewNotifications(list);

      setItems(list);
      setUnread(countRes.count);

      if (toastsEnabled && newOnes.length > 0) {
        const liveNew = newOnes.filter(isRecentlyCreatedNotification);
        const backlogNew = newOnes.filter((n) => !isRecentlyCreatedNotification(n));

        if (liveNew.length > 0) {
          pushLiveToasts(liveNew);
        }

        if (backlogNew.length > 0) {
          if (catchUpActiveRef.current || catchUpQueueRef.current.length > 0) {
            const unreadBacklog = backlogNew.filter((n) => !n.read);
            if (unreadBacklog.length > 0) enqueueCatchUp(unreadBacklog);
          } else {
            pushLiveToasts(backlogNew);
          }
        }
      }
    } catch {
      /* ignore polling errors */
    }
  }, [user, toastsEnabled, diffNewNotifications, pushLiveToasts, enqueueCatchUp]);

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
      setToastsEnabledState(false);
      return;
    }

    catchUpShownRef.current = loadCatchUpShownIds(user.id);
    if (isCatchUpDoneForSession(user.id)) {
      catchUpInitializedRef.current = true;
    }

    setToastsEnabledState(true);
    refresh();
    const interval = toastsEnabled ? PORTAL_POLL_MS : POLL_MS;
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [user, loading, refresh, toastsEnabled]);

  useEffect(() => {
    if (!toastsEnabled || !user || catchUpInitializedRef.current) return;
    if (isCatchUpDoneForSession(user.id)) {
      catchUpInitializedRef.current = true;
      return;
    }

    const startCatchUp = (list: AppNotification[]) => {
      catchUpInitializedRef.current = true;
      markCatchUpDoneForSession(user.id);
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

  const clearAll = useCallback(async () => {
    setBusy(true);
    try {
      await api.notifications.clearAll();
      setItems([]);
      setUnread(0);
      setToasts([]);
      seenIdsRef.current = new Set();
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

      if (canPurchaseFromMarketplace(user.roleId) && isClientOrderNotification(n)) {
        try {
          const order = await resolveBuyerOrderFromNotification(n);
          if (order) {
            setSelectedOrder(order);
            return;
          }
        } catch {
          /* fall through to orders page with deep link */
        }

        const destination = getNotificationDestination(n, user.roleId) ?? "/orders";
        router.push(destination);
        return;
      }

      const destination = getNotificationDestination(n, user.roleId);
      if (destination) router.push(destination);
    },
    [user, router, markNotificationRead]
  );

  const closeOrderModal = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  const value: NotificationContextValue = {
    items,
    unread,
    busy,
    panelOpen,
    setPanelOpen,
    refresh,
    showLiveNotifications,
    markAllRead,
    clearAll,
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
