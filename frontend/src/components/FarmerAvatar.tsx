"use client";

import { useEffect, useState } from "react";
import { assetUrl, assetUrlFallback } from "@/lib/assetUrl";
import { Icon } from "@/components/icons";

interface ProfilePhotoProps {
  src?: string | null;
  name?: string;
  size?: number;
  cacheBust?: number;
  className?: string;
  onClick?: () => void;
}

function withCacheBust(url: string, cacheBust?: number | string) {
  if (cacheBust === undefined || cacheBust === "") return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${cacheBust}`;
}

export function ProfilePhoto({
  src,
  name,
  size = 128,
  cacheBust,
  className = "",
  onClick,
}: ProfilePhotoProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    const url = assetUrl(src);
    setDisplayUrl(url ? withCacheBust(url, cacheBust) : null);
    setTriedFallback(false);
  }, [src, cacheBust]);

  const style = { width: size, height: size };

  const handleError = () => {
    if (triedFallback) {
      setDisplayUrl(null);
      return;
    }
    const fallback = assetUrlFallback(src);
    if (fallback) {
      setTriedFallback(true);
      setDisplayUrl(withCacheBust(fallback, cacheBust));
    } else {
      setDisplayUrl(null);
    }
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border-4 border-white bg-brand-100 shadow-lg ring-2 ring-brand-200 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={onClick ? "Click to change photo" : undefined}
    >
      {displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt={name ? `${name}'s profile` : "Profile photo"}
          className="h-full w-full object-cover"
          width={size}
          height={size}
          onError={handleError}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center text-brand-600">
          <Icon name="user" className="text-brand-600" style={{ width: size * 0.35, height: size * 0.35 }} />
          {size >= 100 && (
            <span className="mt-1 px-2 text-center text-[10px] font-medium leading-tight text-brand-500">
              Add photo
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  cacheBust?: number;
}

const avatarSizes = { sm: 48, md: 80, lg: 120, xl: 160 };

export function FarmerAvatar({ src, name, size = "sm", cacheBust }: AvatarProps) {
  return (
    <ProfilePhoto
      src={src}
      name={name}
      size={avatarSizes[size]}
      cacheBust={cacheBust}
    />
  );
}

export function ProductImage({
  src,
  alt,
  className,
  cacheBust,
}: {
  src: string;
  alt: string;
  className?: string;
  cacheBust?: number | string;
}) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(() => {
    const url = assetUrl(src);
    return url ? withCacheBust(url, cacheBust) : null;
  });
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    const url = assetUrl(src);
    setDisplayUrl(url ? withCacheBust(url, cacheBust) : null);
    setTriedFallback(false);
  }, [src, cacheBust]);

  if (!displayUrl) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayUrl}
      alt={alt}
      className={className || "h-48 w-full rounded-xl object-cover"}
      onError={() => {
        if (triedFallback) {
          setDisplayUrl(null);
          return;
        }
        const fallback = assetUrlFallback(src);
        if (fallback) {
          setTriedFallback(true);
          setDisplayUrl(withCacheBust(fallback, cacheBust));
        } else {
          setDisplayUrl(null);
        }
      }}
    />
  );
}
