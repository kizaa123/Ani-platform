"use client";

import { useEffect, useState } from "react";

/**
 * Resolve image URLs for profile photos and product images.
 * Prefer same-origin paths (Next.js rewrites /uploads to the backend).
 */
export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("blob:")) return path;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      if (u.pathname.startsWith("/uploads")) return u.pathname;
    } catch {
      /* keep absolute URL */
    }
    return path;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function assetUrlFallback(path?: string | null): string | null {
  const primary = assetUrl(path);
  if (!primary || primary.startsWith("http") || primary.startsWith("blob:")) return null;

  const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (apiOrigin) return `${apiOrigin}${primary}`;

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001${primary}`;
  }

  return null;
}
