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
import { AppNotification } from "@/lib/types";
import { getNotificationDestination } from "@/lib/notificationNavigation";
import { NotificationToastStack } from "@/components/NotificationToastStack";

export type NotificationToastItem = {
  toastId: string;
  notification: AppNotification;
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
const MAX_TOASTS = 3;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<NotificationToastItem[]>([]);
  const [toastsEnabled, setToastsEnabledState] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const setToastsEnabled = useCallback((enabled: boolean) => {
    setToastsEnabledState(enabled);
    if (!enabled) setToasts([]);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

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

      if (toastsEnabled && newOnes.length > 0) {
        const sorted = [...newOnes].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setToasts((prev) => {
          const incoming = sorted.map((notification) => ({
            toastId: `${notification.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            notification,
          }));
          return [...incoming, ...prev].slice(0, MAX_TOASTS);
        });
      }
    } catch {
      /* ignore polling errors */
    }
  }, [user, toastsEnabled]);

  useEffect(() => {
    if (!user || loading) {
      seenIdsRef.current = new Set();
      initializedRef.current = false;
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

  const openNotification = useCallback(
    async (n: AppNotification) => {
      if (!user) return;
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
      setPanelOpen(false);
      const destination = getNotificationDestination(n, user.roleId);
      if (destination) router.push(destination);
    },
    [user, router]
  );

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
    </NotificationContext.Provider>
  );
}
