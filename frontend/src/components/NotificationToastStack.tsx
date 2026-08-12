"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppNotification } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { Icon, NOTIFICATION_ICONS } from "@/components/icons";
import type { NotificationToastItem } from "@/context/NotificationProvider";

const DEFAULT_AUTO_DISMISS_MS = 4000;
const SWIPE_DISMISS_PX = 56;

function useMinWidth(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function ToastThumbnail({ n }: { n: AppNotification }) {
  const imageUrl = n.metadata?.imageUrl;
  const iconName = NOTIFICATION_ICONS[n.type] ?? "bell";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-xl border border-brand-100 object-cover"
      />
    );
  }

  if (n.actor?.profilePicture) {
    return (
      <AvatarWithVerification
        src={n.actor.profilePicture}
        name={n.actor.firstName}
        size={44}
        verificationStatus={n.actor.verificationStatus}
        verificationTags={n.actor.verificationTags}
        className="shrink-0 rounded-xl"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
      <Icon name={iconName} className="h-5 w-5" />
    </div>
  );
}

function NotificationToast({
  item,
  onDismiss,
  onOpen,
}: {
  item: NotificationToastItem;
  onOpen: (n: AppNotification) => void;
  onDismiss: (toastId: string) => void;
}) {
  const { toastId, notification: n, autoDismissMs = DEFAULT_AUTO_DISMISS_MS } = item;
  const isLaptop = useMinWidth("(min-width: 1024px)");
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const dragOffsetRef = useRef(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    window.setTimeout(() => onDismiss(toastId), 260);
  }, [leaving, onDismiss, toastId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    dismissTimer.current = setTimeout(dismiss, autoDismissMs);
    return () => {
      cancelAnimationFrame(frame);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [dismiss, autoDismissMs]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    const offset = delta < 0 ? delta : delta * 0.15;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffsetRef.current <= -SWIPE_DISMISS_PX) {
      dismiss();
      return;
    }
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  const opacity = leaving ? 0 : Math.max(0.35, 1 - Math.abs(dragOffset) / 120);
  const translateY = leaving ? (isLaptop ? 24 : -24) : dragOffset;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto w-full max-w-sm touch-pan-y ${
        entered && !leaving ? "notification-toast-enter" : ""
      } ${leaving ? "notification-toast-exit" : ""}`}
      style={{
        transform: `translateY(${translateY}px)`,
        opacity: entered ? opacity : 0,
        transition: isDragging ? "none" : "transform 260ms ease, opacity 260ms ease",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative overflow-hidden rounded-2xl border border-brand-100/80 bg-white/95 shadow-[0_12px_40px_rgba(27,67,50,0.14)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
            onDismiss(toastId);
            onOpen(n);
          }}
          className="flex w-full items-start gap-3 p-3.5 pr-10 text-left transition hover:bg-brand-50/50"
        >
          <ToastThumbnail n={n} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-sm font-semibold text-brand-900">{n.title}</p>
            {n.body && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600">
                {n.body}
              </p>
            )}
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-brand-600">
              Tap to view
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-brand-50 hover:text-brand-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function NotificationToastStack({
  toasts,
  onDismiss,
  onOpen,
}: {
  toasts: NotificationToastItem[];
  onDismiss: (toastId: string) => void;
  onOpen: (n: AppNotification) => void;
}) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!portalReady || toasts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[85] flex flex-col items-center gap-2 px-4 sm:top-4 lg:inset-x-auto lg:left-auto lg:right-5 lg:top-auto lg:bottom-5 lg:flex-col-reverse lg:items-end lg:px-0 lg:pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      aria-label="Live notifications"
    >
      {toasts.map((item) => (
        <NotificationToast
          key={item.toastId}
          item={item}
          onDismiss={onDismiss}
          onOpen={onOpen}
        />
      ))}
    </div>,
    document.body
  );
}
