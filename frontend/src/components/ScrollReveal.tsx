"use client";

import type { ReactNode } from "react";
import {
  useScrollAnimation,
  type UseScrollAnimationOptions,
} from "@/hooks/useScrollAnimation";

export type ScrollRevealProps = UseScrollAnimationOptions & {
  children: ReactNode;
  className?: string;
};

/** Reusable scroll- or mount-triggered reveal wrapper. Respects prefers-reduced-motion. */
export function ScrollReveal({
  children,
  className = "",
  ...options
}: ScrollRevealProps) {
  const { ref, style, className: animClass } = useScrollAnimation(options);

  return (
    <div ref={ref} className={`${animClass}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}
