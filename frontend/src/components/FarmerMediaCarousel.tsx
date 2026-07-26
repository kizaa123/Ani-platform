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
  onLike: () => void;
  onShare: () => void;
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

      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onLike}
          aria-label={item.likedByMe ? "Unlike" : "Like"}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur ${
            item.likedByMe
              ? "bg-red-500/90 text-white"
              : "bg-black/40 text-white hover:bg-black/55"
          }`}
        >
          <Icon name="heart" className="h-4 w-4" />
          {item.likesCount > 0 ? item.likesCount : null}
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share"
          className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur hover:bg-black/55"
        >
          <Icon name="share" className="h-4 w-4" />
          {item.sharesCount > 0 ? item.sharesCount : null}
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

  const handleLike = async (item: FarmerMediaItem) => {
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

  const handleShare = async (item: FarmerMediaItem) => {
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
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 shadow-md">
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
                onLike={() => handleLike(item)}
                onShare={() => handleShare(item)}
              />
            </div>
          ))}
        </div>
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
