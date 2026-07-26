"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { FarmerMediaItem } from "@/lib/types";
import { assetUrl } from "@/lib/assetUrl";
import { Icon } from "@/components/icons";

interface FarmerMediaCarouselProps {
  farmerUserId: string;
  farmerName?: string;
}

function MediaSlide({
  item,
  active,
  onLike,
  onShare,
}: {
  item: FarmerMediaItem;
  active: boolean;
  onLike: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = assetUrl(item.url);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || item.type !== "VIDEO") return;
    if (active) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, item.type]);

  return (
    <div className="relative h-full w-full shrink-0 snap-center">
      {item.type === "VIDEO" && src ? (
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          autoPlay={active}
          preload="metadata"
        />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : null}

      {/* Like & Share — stacked vertically on the right */}
      <div className="absolute bottom-3 right-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onLike}
          aria-label={item.likedByMe ? "Unlike" : "Like"}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-2 text-xs font-semibold backdrop-blur transition-colors ${
            item.likedByMe
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : "bg-black/45 text-white hover:bg-black/60"
          }`}
        >
          <Icon name="heart" className="h-5 w-5" />
          {item.likesCount > 0 && (
            <span className="leading-none">{item.likesCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onShare}
          aria-label="Share"
          className="flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <Icon name="share" className="h-5 w-5" />
          {item.sharesCount > 0 && (
            <span className="leading-none">{item.sharesCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export function FarmerMediaCarousel({ farmerUserId, farmerName }: FarmerMediaCarouselProps) {
  const [items, setItems] = useState<FarmerMediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(0);
    api.farm.media
      .listByFarmer(farmerUserId)
      .then(setItems)
      .catch(() => setItems([]));
  }, [farmerUserId]);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const width = container.clientWidth;
    container.scrollTo({ left: width * index, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !container.clientWidth) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActiveIndex(Math.min(Math.max(0, index), items.length - 1));
  }, [items.length]);

  const handlePrev = () => scrollToIndex(Math.max(0, activeIndex - 1));
  const handleNext = () => scrollToIndex(Math.min(items.length - 1, activeIndex + 1));

  const handleLike = async (e: React.MouseEvent, item: FarmerMediaItem) => {
    e.stopPropagation();
    try {
      const result = await api.farm.media.like(item.id);
      setItems((prev) =>
        prev.map((m) =>
          m.id === item.id ? { ...m, likedByMe: result.liked, likesCount: result.likesCount } : m
        )
      );
    } catch {
      /* ignore */
    }
  };

  const handleShare = async (e: React.MouseEvent, item: FarmerMediaItem) => {
    e.stopPropagation();
    const src = assetUrl(item.url);
    const absoluteUrl =
      src && typeof window !== "undefined"
        ? src.startsWith("http")
          ? src
          : `${window.location.origin}${src}`
        : typeof window !== "undefined"
          ? window.location.href
          : "";

    try {
      if (absoluteUrl && navigator.share) {
        await navigator.share({
          title: farmerName ? `${farmerName}'s farm` : "Farm media",
          url: absoluteUrl,
        });
      } else if (absoluteUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(absoluteUrl);
      }
      const result = await api.farm.media.share(item.id);
      setItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, sharesCount: result.sharesCount } : m))
      );
    } catch {
      /* user cancelled share or clipboard failed */
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600">
        From the farm
      </p>
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 shadow-md">
        {/* Scroll strip */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-56 snap-x snap-mandatory overflow-x-auto scroll-smooth sm:h-72 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <div key={item.id} className="h-full w-full shrink-0 grow-0 basis-full">
              <MediaSlide
                item={item}
                active={index === activeIndex}
                onLike={(e) => handleLike(e, item)}
                onShare={(e) => handleShare(e, item)}
              />
            </div>
          ))}
        </div>

        {/* Prev / Next arrows — desktop only (hidden on mobile) */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeIndex === 0}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-30 sm:flex"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={activeIndex === items.length - 1}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-30 sm:flex"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators — always visible */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-brand-100 bg-white px-4 py-3">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex ? "w-6 bg-brand-600" : "w-2 bg-brand-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
