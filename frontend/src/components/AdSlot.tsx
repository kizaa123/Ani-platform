"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdPlacement, PlatformAd } from "@/lib/types";
import { Icon } from "@/components/icons";

type AdSlotProps = {
  placement: AdPlacement;
  /** Compact horizontal strip for global portal banner */
  variant?: "banner" | "strip";
  className?: string;
};

function AdBannerContent({
  ad,
  variant,
  onNavigate,
}: {
  ad: PlatformAd;
  variant: "banner" | "strip";
  onNavigate: () => void;
}) {
  const clickable = Boolean(ad.linkUrl);

  const inner = (
    <>
      <div
        className={
          variant === "strip"
            ? "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-32"
            : "relative aspect-[3/1] w-full overflow-hidden sm:aspect-[4/1]"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/50 via-brand-900/20 to-transparent" />
      </div>
      <div className={variant === "strip" ? "min-w-0 flex-1 py-1" : "absolute inset-0 flex flex-col justify-end p-4 sm:p-6"}>
        <p
          className={
            variant === "strip"
              ? "truncate text-sm font-bold text-brand-900 sm:text-base"
              : "text-lg font-bold text-white drop-shadow sm:text-2xl"
          }
        >
          {ad.title}
        </p>
        {ad.description && variant === "banner" && (
          <p className="mt-1 max-w-xl text-sm text-white/90 drop-shadow line-clamp-2">
            {ad.description}
          </p>
        )}
        {ad.description && variant === "strip" && (
          <p className="mt-0.5 truncate text-xs text-gray-600 sm:text-sm">{ad.description}</p>
        )}
        {(ad.ctaLabel || clickable) && variant === "banner" && (
          <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-800 shadow-sm sm:text-sm">
            {ad.ctaLabel || "Learn more"}
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  const shellClass =
    variant === "strip"
      ? "flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/80 p-3 shadow-sm"
      : "relative overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm";

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className={`${shellClass} w-full text-left transition hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-300`}
      >
        {inner}
      </button>
    );
  }

  return <div className={shellClass}>{inner}</div>;
}

export function AdSlot({ placement, variant = "banner", className = "" }: AdSlotProps) {
  const [ads, setAds] = useState<PlatformAd[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.ads
      .list(placement)
      .then((rows) => {
        if (!cancelled) {
          setAds(rows);
          setIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [ads.length]);

  const openLink = useCallback((url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  if (!loaded || ads.length === 0) return null;

  const current = ads[index] ?? ads[0];

  return (
    <div className={className} role="region" aria-label="Platform promotion">
      <AdBannerContent
        ad={current}
        variant={variant}
        onNavigate={() => openLink(current.linkUrl)}
      />
      {ads.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {ads.map((ad, i) => (
            <button
              key={ad.id}
              type="button"
              aria-label={`Show promotion ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-brand-600" : "w-1.5 bg-brand-200 hover:bg-brand-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
