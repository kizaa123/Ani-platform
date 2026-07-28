"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useScrollAnimation } from "./useScrollAnimation";

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

export type UseAnimateOnViewOptions = {
  /** Delay before animation starts (ms). */
  delay?: number;
  /** Animation duration (ms). Default 1200 — matches chart draw timing. */
  duration?: number;
  threshold?: number;
  rootMargin?: string;
};

/** Intersection-triggered 0→1 progress. Respects prefers-reduced-motion. */
export function useAnimateOnView({
  delay = 0,
  duration = 1200,
  threshold = 0.15,
  rootMargin = "0px 0px -24px 0px",
}: UseAnimateOnViewOptions = {}) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
  const { ref, isVisible } = useScrollAnimation({ threshold, rootMargin, once: true });
  const [progress, setProgress] = useState(0);
  const effectiveProgress = reducedMotion ? 1 : progress;

  useEffect(() => {
    if (!isVisible || reducedMotion) return;

    const startAt = performance.now() + delay;

    const tick = (now: number) => {
      const elapsed = now - startAt;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(elapsed / duration, 1);
      setProgress(easeOutCubic(t));

      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [isVisible, reducedMotion, delay, duration]);

  return { ref, progress: effectiveProgress, isVisible };
}
