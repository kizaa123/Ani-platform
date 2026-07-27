"use client";

import { useState } from "react";

/**
 * Shared loading primitives used across the platform:
 *   - Spinner           → small animated ring for buttons / inline loads
 *   - Skeleton          → grey shimmer block for placeholder content
 *   - SkeletonImage     → white bg grey placeholder for images while they load
 *   - ImageLoader       → image wrapper that hides broken defaults until loaded
 *   - PageLoader        → full-page skeleton (auth bootstrap)
 *   - PageContentSkeleton → in-portal page placeholder while data loads
 */

// ──────────────────────────────────────────────────────────────
// Spinner
// ──────────────────────────────────────────────────────────────

interface SpinnerProps {
  /** Tailwind size classes — default h-5 w-5 */
  className?: string;
  /** Tailwind colour class for the arc — default text-brand-600 */
  color?: string;
}

export function Spinner({ className = "h-5 w-5", color = "text-brand-600" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${color} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/** Inline spinner + label for upload / action buttons */
export function SpinnerLabel({
  label = "Loading...",
  className = "h-4 w-4",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner className={className} />
      <span>{label}</span>
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// Skeleton block
// ──────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  rounded?: string;
}

export function Skeleton({ className = "h-4 w-full", rounded = "rounded-lg" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200 ${rounded} ${className}`}
    />
  );
}

// ──────────────────────────────────────────────────────────────
// SkeletonImage — white container + grey pulse (no broken icons)
// ──────────────────────────────────────────────────────────────

export function SkeletonImage({
  className = "h-full w-full",
  rounded = "",
  showSpinner = false,
}: {
  className?: string;
  rounded?: string;
  showSpinner?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden bg-white ${rounded} ${className}`}
    >
      <div className={`absolute inset-0 animate-pulse bg-gray-200 ${rounded}`} />
      {showSpinner && (
        <Spinner className="relative z-10 h-6 w-6 text-gray-400" color="text-gray-400" />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ImageLoader — hides broken/default browser placeholders
// ──────────────────────────────────────────────────────────────

interface ImageLoaderProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  rounded?: string;
  width?: number;
  height?: number;
  onError?: () => void;
  onLoad?: () => void;
  /** Shown when src is missing or failed to load */
  fallback?: React.ReactNode;
  objectFit?: "cover" | "contain";
}

export function ImageLoader(props: ImageLoaderProps) {
  const { src, fallback } = props;
  if (!src) {
    return <>{fallback ?? <SkeletonImage className={props.className} rounded={props.rounded} />}</>;
  }
  return <ImageLoaderInner key={src} {...props} src={src} />;
}

function ImageLoaderInner({
  src,
  alt,
  className = "h-full w-full",
  containerClassName = "relative h-full w-full overflow-hidden",
  rounded = "",
  width,
  height,
  onError,
  onLoad,
  fallback,
  objectFit = "cover",
}: ImageLoaderProps & { src: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  if (status === "error") {
    return <>{fallback ?? <SkeletonImage className={className} rounded={rounded} />}</>;
  }

  return (
    <div className={`${containerClassName} bg-white ${rounded}`}>
      {status !== "loaded" && (
        <SkeletonImage className={`absolute inset-0 ${rounded}`} showSpinner />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${fitClass} ${rounded} ${
          status === "loaded" ? "relative z-10 opacity-100" : "absolute inset-0 opacity-0"
        }`}
        onLoad={() => {
          setStatus("loaded");
          onLoad?.();
        }}
        onError={() => {
          setStatus("error");
          onError?.();
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Card grid skeleton — reusable for marketplace, library, etc.
// ──────────────────────────────────────────────────────────────

export function CardGridSkeleton({
  count = 6,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
  imageHeight = "h-40",
}: {
  count?: number;
  columns?: string;
  imageHeight?: string;
}) {
  return (
    <div className={`grid gap-4 ${columns}`} aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <SkeletonImage className={`${imageHeight} w-full rounded-xl`} />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PageContentSkeleton — in-portal page loading placeholder
// ──────────────────────────────────────────────────────────────

export function PageContentSkeleton({
  variant = "grid",
  maxWidth = "max-w-6xl",
}: {
  variant?: "grid" | "list" | "form";
  maxWidth?: string;
}) {
  return (
    <div
      className={`mx-auto ${maxWidth} px-4 py-10`}
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-8 h-4 w-72" />

      {variant === "form" ? (
        <div className="mx-auto max-w-lg space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" rounded="rounded-xl" />
          <Skeleton className="h-10 w-full" rounded="rounded-xl" />
          <SkeletonImage className="h-48 w-full rounded-xl" />
          <Skeleton className="h-10 w-32" rounded="rounded-xl" />
        </div>
      ) : variant === "list" ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <Skeleton className="h-16 w-16 shrink-0" rounded="rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CardGridSkeleton />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PageLoader — full-page skeleton used while auth resolves
// ──────────────────────────────────────────────────────────────

export function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col bg-white" aria-busy="true" aria-label="Loading">
      {/* Fake top bar */}
      <div className="flex h-16 items-center border-b border-gray-100 px-6">
        <Skeleton className="h-8 w-28" />
        <div className="ml-auto flex gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1">
        {/* Fake sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r border-gray-100 p-5 lg:flex">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-12 w-full" rounded="rounded-xl" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" rounded="rounded-xl" />
            ))}
          </div>
        </aside>

        {/* Fake page content */}
        <main className="flex-1 space-y-6 p-6 lg:p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <CardGridSkeleton />
        </main>
      </div>
    </div>
  );
}
