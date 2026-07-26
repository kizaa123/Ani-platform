"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ProductMediaItem } from "@/lib/types";
import { assetUrl } from "@/lib/assetUrl";
import { ProductImage } from "@/components/FarmerAvatar";
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
      <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
        <Icon name="wheat" className="h-16 w-16 text-brand-400" />
      </div>
    );
  }

  if (item?.type === "VIDEO") {
    return (
      <video
        ref={videoRef}
        src={src}
        className="aspect-square w-full object-contain bg-black"
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
    <img src={src} alt={alt} className="aspect-square w-full object-contain bg-white" />
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
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialMedia);
    setActiveIndex(0);
  }, [initialMedia, listingId]);

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
    const clamped = Math.max(0, Math.min(index, totalSlides - 1));
    setActiveIndex(clamped);
    const thumb = thumbRef.current?.children[clamped] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const handlePrev = () => goTo(activeIndex - 1);
  const handleNext = () => goTo(activeIndex + 1);

  const handleLike = async () => {
    if (!activeItem || !interactive) return;
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

  const shareUrl = activeItem
    ? absoluteMediaUrl(activeItem.url)
    : activeFallback
      ? absoluteMediaUrl(activeFallback)
      : typeof window !== "undefined"
        ? window.location.href
        : "";

  if (totalSlides === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <MainViewer alt={productTitle} active />
      </div>
    );
  }

  const thumbs = hasMedia
    ? items.map((item) => ({ key: item.id, item, fallback: undefined as string | undefined }))
    : fallbackImages.map((url, i) => ({
        key: `fallback-${i}`,
        item: undefined as ProductMediaItem | undefined,
        fallback: url,
      }));

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Main viewer — Amazon-style large display */}
      <div className="group relative bg-gray-50">
        <MainViewer
          item={activeItem}
          fallbackSrc={activeFallback}
          alt={productTitle}
          active
        />

        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeIndex === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={activeIndex >= totalSlides - 1}
              aria-label="Next image"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {interactive && activeItem && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleLike}
              aria-label={activeItem.likedByMe ? "Unlike" : "Like"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition ${
                activeItem.likedByMe
                  ? "bg-red-500 text-white"
                  : "border border-gray-200 bg-white/95 text-gray-700 hover:bg-white"
              }`}
            >
              <Icon name="heart" className="h-4 w-4" />
              {activeItem.likesCount > 0 && <span>{activeItem.likesCount}</span>}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShareOpen((o) => !o)}
                aria-label="Share"
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur transition hover:bg-white"
              >
                <Icon name="share" className="h-4 w-4" />
                {activeItem.sharesCount > 0 && <span>{activeItem.sharesCount}</span>}
              </button>
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
      </div>

      {/* Thumbnail strip */}
      {totalSlides > 1 && (
        <div
          ref={thumbRef}
          className="flex gap-2 overflow-x-auto border-t border-gray-100 bg-white p-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {thumbs.map(({ key, item, fallback }, i) => (
            <button
              key={key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`View media ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${
                i === activeIndex
                  ? "border-brand-600 ring-1 ring-brand-500"
                  : "border-gray-200 opacity-70 hover:opacity-100"
              }`}
            >
              {item?.type === "VIDEO" ? (
                <>
                  <video
                    src={assetUrl(item.url) ?? undefined}
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </>
              ) : item ? (
                <ProductImage src={item.url} alt="" className="h-full w-full object-cover" />
              ) : fallback ? (
                <ProductImage src={fallback} alt="" className="h-full w-full object-cover" />
              ) : null}
            </button>
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
