"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ProductMediaItem } from "@/lib/types";
import { assetUrl } from "@/lib/assetUrl";
import { Icon } from "@/components/icons";

interface ProductMediaGalleryProps {
  listingId: string;
  productTitle: string;
  media: ProductMediaItem[];
  /** Fallback image URLs when no product media exists */
  fallbackImages?: string[];
  /** When false, hide like/share controls (e.g. farmer preview) */
  interactive?: boolean;
  onMediaChange?: (items: ProductMediaItem[]) => void;
}

function absoluteMediaUrl(url: string): string {
  const src = assetUrl(url);
  if (!src) return typeof window !== "undefined" ? window.location.href : "";
  if (src.startsWith("http")) return src;
  return typeof window !== "undefined" ? `${window.location.origin}${src}` : src;
}

function ShareMenu({
  shareUrl,
  productTitle,
  onShare,
  onClose,
}: {
  shareUrl: string;
  productTitle: string;
  onShare: () => void;
  onClose: () => void;
}) {
  const text = encodeURIComponent(`Check out ${productTitle} on ANI Platform`);
  const url = encodeURIComponent(shareUrl);

  const options = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${text}%20${url}`,
      icon: "💬",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      icon: "📘",
    },
    {
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      icon: "𝕏",
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onShare();
      onClose();
    } catch {
      /* ignore */
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: productTitle, url: shareUrl });
        onShare();
        onClose();
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      {"share" in navigator && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
        >
          <Icon name="share" className="h-4 w-4" />
          Share via…
        </button>
      )}
      {options.map((opt) => (
        <a
          key={opt.label}
          href={opt.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            onShare();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
        >
          <span>{opt.icon}</span>
          {opt.label}
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
      >
        Copy link
      </button>
    </div>
  );
}

function MainViewer({
  item,
  fallbackSrc,
  alt,
  active,
}: {
  item?: ProductMediaItem;
  fallbackSrc?: string;
  alt: string;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = item ? assetUrl(item.url) : fallbackSrc ? assetUrl(fallbackSrc) : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || item?.type !== "VIDEO") return;
    if (active) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, item?.type]);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
        <Icon name="wheat" className="h-16 w-16 text-brand-400" />
      </div>
    );
  }

  if (item?.type === "VIDEO") {
    return (
      <video
        key={src}
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain bg-black"
        muted
        loop
        playsInline
        autoPlay={active}
        preload="metadata"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={src} src={src} alt={alt} className="h-full w-full object-contain bg-white" />
  );
}

export function ProductMediaGallery({
  listingId,
  productTitle,
  media: initialMedia,
  fallbackImages = [],
  interactive = true,
  onMediaChange,
}: ProductMediaGalleryProps) {
  const [items, setItems] = useState(initialMedia);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  /** Local liked state for legacy fallback images (no media id for API) */
  const [fallbackLiked, setFallbackLiked] = useState<Record<number, boolean>>({});

  // Touch / mouse drag state
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  // Reset slide only when switching products — not on every parent re-render
  // (listing.media ?? [] creates a new [] reference each render and was resetting activeIndex)
  useEffect(() => {
    setItems(initialMedia);
    setActiveIndex(0);
    setFallbackLiked({});
    setShareOpen(false);
  }, [listingId]);

  useEffect(() => {
    setShareOpen(false);
  }, [activeIndex]);

  const hasMedia = items.length > 0;
  const hasFallback = fallbackImages.length > 0;
  const totalSlides = hasMedia ? items.length : hasFallback ? fallbackImages.length : 0;
  const activeItem = hasMedia ? items[activeIndex] : undefined;
  const activeFallback = !hasMedia && hasFallback ? fallbackImages[activeIndex] : undefined;

  const updateItems = useCallback(
    (next: ProductMediaItem[]) => {
      setItems(next);
      onMediaChange?.(next);
    },
    [onMediaChange]
  );

  const goTo = (index: number) => {
    setActiveIndex((prev) => {
      const max = Math.max(totalSlides - 1, 0);
      const target = Number.isFinite(index) ? index : prev;
      return Math.max(0, Math.min(target, max));
    });
  };

  const goPrev = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const goNext = () => {
    setActiveIndex((prev) => Math.min(Math.max(totalSlides - 1, 0), prev + 1));
  };

  // ── Touch handlers ──────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) < 30) return; // ignore tiny taps
    if (delta < 0) goNext();
    else goPrev();
  };

  // ── Mouse drag handlers (desktop) ───────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    isDragging.current = false;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 5) isDragging.current = true;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (!isDragging.current || Math.abs(delta) < 30) return;
    if (delta < 0) goNext();
    else goPrev();
  };
  const handleMouseLeave = () => {
    dragStartX.current = null;
    isDragging.current = false;
  };

  const handleLike = async () => {
    if (!interactive) return;
    if (activeItem) {
      try {
        const result = await api.marketplace.media.like(listingId, activeItem.id);
        updateItems(
          items.map((m) =>
            m.id === activeItem.id ? { ...m, likedByMe: result.liked, likesCount: result.likesCount } : m
          )
        );
      } catch {
        /* ignore */
      }
      return;
    }
    if (activeFallback) {
      setFallbackLiked((prev) => ({ ...prev, [activeIndex]: !prev[activeIndex] }));
    }
  };

  const handleShareRecorded = async () => {
    if (!activeItem || !interactive) return;
    try {
      const result = await api.marketplace.media.share(listingId, activeItem.id);
      updateItems(
        items.map((m) => (m.id === activeItem.id ? { ...m, sharesCount: result.sharesCount } : m))
      );
    } catch {
      /* ignore */
    }
  };

  const showControls = interactive && Boolean(activeItem || activeFallback);
  const likedByMe = activeItem ? activeItem.likedByMe : Boolean(fallbackLiked[activeIndex]);

  const shareUrl = activeItem
    ? absoluteMediaUrl(activeItem.url)
    : activeFallback
      ? absoluteMediaUrl(activeFallback)
      : typeof window !== "undefined"
        ? window.location.href
        : "";

  const viewerShell = (
    <>
      <div className="absolute inset-0">
        <MainViewer
          key={activeItem?.id ?? activeFallback ?? `slide-${activeIndex}`}
          item={activeItem}
          fallbackSrc={activeFallback}
          alt={productTitle}
          active
        />
      </div>

        {/* ── Prev / Next arrows — desktop only (md+) ── */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              disabled={activeIndex === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/60 disabled:opacity-30 md:flex"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              disabled={activeIndex === totalSlides - 1}
              aria-label="Next image"
              className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/60 disabled:opacity-30 md:flex"
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          </>
        )}

      {/* ── Like / Share controls ── */}
      {showControls && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLike}
              aria-label={likedByMe ? "Unlike" : "Like"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm backdrop-blur transition hover:bg-white"
            >
              <Icon
                name="heart"
                className={`h-5 w-5 ${likedByMe ? "fill-red-500 text-red-500" : "fill-none text-gray-600"}`}
              />
            </button>
            {activeItem && activeItem.likesCount > 0 && (
              <span className="text-xs font-semibold text-gray-700">{activeItem.likesCount}</span>
            )}
          </div>

          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShareOpen((o) => !o)}
              aria-label="Share"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm backdrop-blur transition hover:bg-white"
            >
              <Icon name="share" className="h-5 w-5 text-gray-600" />
            </button>
            {activeItem && activeItem.sharesCount > 0 && (
              <span className="text-xs font-semibold text-gray-700">{activeItem.sharesCount}</span>
            )}
            {shareOpen && (
              <ShareMenu
                shareUrl={shareUrl}
                productTitle={productTitle}
                onShare={handleShareRecorded}
                onClose={() => setShareOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );

  const viewerClassName =
    "group relative aspect-square w-full shrink-0 cursor-grab overflow-hidden bg-gray-50 active:cursor-grabbing select-none";

  if (totalSlides === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className={viewerClassName}>
          <div className="absolute inset-0">
            <MainViewer alt={productTitle} active />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* ── Main viewer — fixed square, swipeable / draggable ── */}
      <div
        className={viewerClassName}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {viewerShell}
      </div>

      {/* ── Dot indicators — manual slide picker ── */}
      {totalSlides > 1 && (
        <div
          className="flex items-center justify-center gap-2 border-t border-gray-100 bg-white px-3 py-3"
          role="tablist"
          aria-label="Product media"
        >
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={hasMedia ? items[i]?.id ?? i : `fallback-${i}`}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`View media ${i + 1} of ${totalSlides}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === activeIndex
                  ? "scale-110 bg-brand-600"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** First thumbnail URL for product cards */
export function productMediaThumbnail(product: {
  media?: ProductMediaItem[];
  images?: string[];
}): string | undefined {
  if (product.media?.length) return product.media[0].url;
  return product.images?.[0];
}

export function productMediaIsVideo(product: {
  media?: ProductMediaItem[];
}): boolean {
  return product.media?.[0]?.type === "VIDEO";
}
