"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

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

const SCROLL_IDLE_MS = 120;

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
  const hasAnimated = useRef(false);
  const rafRef = useRef(0);
  const scrollIdleTimerRef = useRef(0);
  const isScrollingRef = useRef(false);

  const finalDisplay =
    formatNumber(parsed.end, parsed.useCommas, parsed.decimals) + parsed.suffix;
  const initialDisplay =
    formatNumber(startFrom, parsed.useCommas, parsed.decimals) + parsed.suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      el.textContent = prefix + finalDisplay;
      return;
    }

    el.textContent = prefix + initialDisplay;

    const onScroll = () => {
      isScrollingRef.current = true;
      window.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, SCROLL_IDLE_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    const runAnimation = () => {
      const startAt = performance.now() + delay;

      const tick = (now: number) => {
        const elapsed = now - startAt;
        if (elapsed < 0) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const progress = Math.min(elapsed / duration, 1);
        const next = startFrom + (parsed.end - startFrom) * easeOutCubic(progress);
        el.textContent =
          prefix + formatNumber(next, parsed.useCommas, parsed.decimals) + parsed.suffix;

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          el.textContent = prefix + finalDisplay;
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const startWhenScrollIdle = () => {
      const wait = () => {
        if (isScrollingRef.current) {
          scrollIdleTimerRef.current = window.setTimeout(wait, 50);
          return;
        }
        runAnimation();
      };
      wait();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;

        hasAnimated.current = true;
        observer.disconnect();
        startWhenScrollIdle();
      },
      { threshold: 0.15, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.clearTimeout(scrollIdleTimerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    reducedMotion,
    duration,
    delay,
    startFrom,
    parsed.end,
    parsed.useCommas,
    parsed.decimals,
    parsed.suffix,
    prefix,
    finalDisplay,
    initialDisplay,
  ]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {reducedMotion ? finalDisplay : initialDisplay}
    </span>
  );
}
