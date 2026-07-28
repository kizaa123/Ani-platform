"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type ParsedStat = {
  end: number;
  suffix: string;
  useCommas: boolean;
  decimals: number;
};

function parseStatValue(value: string): ParsedStat {
  const match = value.trim().match(/^([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) {
    return { end: 0, suffix: value, useCommas: false, decimals: 0 };
  }

  const raw = match[1];
  const end = Number.parseFloat(raw.replace(/,/g, ""));
  const suffix = match[2] ?? "";
  const decimals = raw.includes(".") ? (raw.split(".")[1]?.length ?? 0) : 0;

  return {
    end: Number.isFinite(end) ? end : 0,
    suffix,
    useCommas: raw.includes(",") || end >= 1000,
    decimals,
  };
}

function formatNumber(value: number, useCommas: boolean, decimals: number): string {
  if (decimals > 0) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  const rounded = Math.round(value);
  return useCommas ? rounded.toLocaleString("en-US") : String(rounded);
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type AnimatedStatProps = {
  value: string;
  /** Prepended text (e.g. currency code). */
  prefix?: string;
  /** Animation duration in ms. Default 1800. */
  duration?: number;
  /** Delay before count starts (ms). */
  delay?: number;
  /** Starting number. Default 0. */
  startFrom?: number;
  className?: string;
};

/** Count-up stat with Intersection Observer trigger. Respects prefers-reduced-motion. */
export function AnimatedStat({
  value,
  prefix = "",
  duration = 1800,
  delay = 0,
  startFrom = 0,
  className = "",
}: AnimatedStatProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const parsed = parseStatValue(value);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
  const [current, setCurrent] = useState(startFrom);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (reducedMotion) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;

        hasAnimated.current = true;
        observer.disconnect();

        const startAt = performance.now() + delay;

        const tick = (now: number) => {
          const elapsed = now - startAt;
          if (elapsed < 0) {
            requestAnimationFrame(tick);
            return;
          }

          const progress = Math.min(elapsed / duration, 1);
          const next = startFrom + (parsed.end - startFrom) * easeOutCubic(progress);
          setCurrent(next);

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        };

        requestAnimationFrame(tick);
      },
      { threshold: 0.15, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, duration, delay, startFrom, parsed.end]);

  const displayValue = reducedMotion
    ? formatNumber(parsed.end, parsed.useCommas, parsed.decimals) + parsed.suffix
    : formatNumber(current, parsed.useCommas, parsed.decimals) + parsed.suffix;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
    </span>
  );
}
