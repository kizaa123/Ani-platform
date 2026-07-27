"use client";

import { useMemo, useState } from "react";
import { assetUrl, assetUrlFallback } from "@/lib/assetUrl";
import { Icon } from "@/components/icons";
import { SkeletonImage, Spinner } from "@/components/LoadingPrimitives";

interface ProfilePhotoProps {
  src?: string | null;
  name?: string;
  size?: number;
  cacheBust?: number;
  className?: string;
  onClick?: () => void;
  /** Show spinner overlay while a new photo is uploading */
  uploading?: boolean;
}

function withCacheBust(url: string, cacheBust?: number | string) {
  if (cacheBust === undefined || cacheBust === "") return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${cacheBust}`;
}

function ProfileFallback({ size, name }: { size: number; name?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 text-gray-400">
      <Icon
        name="user"
        className="text-gray-400"
        style={{ width: size * 0.35, height: size * 0.35 }}
      />
      {size >= 100 && (
        <span className="mt-1 px-2 text-center text-[10px] font-medium leading-tight text-gray-400">
          {name ? "Add photo" : "Add photo"}
        </span>
      )}
    </div>
  );
}

function ProfilePhotoInner({
  src,
  name,
  size,
  cacheBust,
  initialUrl,
  className,
  onClick,
  uploading,
}: ProfilePhotoProps & { initialUrl: string | null }) {
  const [displayUrl, setDisplayUrl] = useState(initialUrl);
  const [triedFallback, setTriedFallback] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const style = { width: size, height: size };
  const showLoading = Boolean(displayUrl) && !imageLoaded && !imageFailed;

  const handleError = () => {
    if (triedFallback) {
      setDisplayUrl(null);
      setImageFailed(true);
      return;
    }
    const fallback = assetUrlFallback(src);
    if (fallback) {
      setTriedFallback(true);
      setDisplayUrl(withCacheBust(fallback, cacheBust));
      setImageLoaded(false);
    } else {
      setDisplayUrl(null);
      setImageFailed(true);
    }
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg ring-2 ring-brand-200 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={onClick ? "Click to change photo" : undefined}
    >
      {showLoading && (
        <SkeletonImage className="absolute inset-0 rounded-full" showSpinner />
      )}

      {displayUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt={name ? `${name}'s profile` : "Profile photo"}
          className={`h-full w-full object-cover ${showLoading ? "opacity-0" : "opacity-100"}`}
          width={size}
          height={size}
          onLoad={() => setImageLoaded(true)}
          onError={handleError}
        />
      ) : (
        !showLoading && <ProfileFallback size={size ?? 128} name={name} />
      )}

      {uploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-white/80">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

export function ProfilePhoto({
  src,
  name,
  size = 128,
  cacheBust,
  className = "",
  onClick,
  uploading = false,
}: ProfilePhotoProps) {
  const initialUrl = useMemo(() => {
    const url = assetUrl(src);
    return url ? withCacheBust(url, cacheBust) : null;
  }, [src, cacheBust]);

  return (
    <ProfilePhotoInner
      key={`${src ?? "none"}-${cacheBust ?? 0}`}
      src={src}
      name={name}
      size={size}
      cacheBust={cacheBust}
      initialUrl={initialUrl}
      className={className}
      onClick={onClick}
      uploading={uploading}
    />
  );
}

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  cacheBust?: number;
  uploading?: boolean;
}

const avatarSizes = { sm: 48, md: 80, lg: 120, xl: 160 };

export function FarmerAvatar({ src, name, size = "sm", cacheBust, uploading }: AvatarProps) {
  return (
    <ProfilePhoto
      src={src}
      name={name}
      size={avatarSizes[size]}
      cacheBust={cacheBust}
      uploading={uploading}
    />
  );
}

function ProductImageInner({
  src,
  alt,
  className,
  initialUrl,
}: {
  src: string;
  alt: string;
  className?: string;
  initialUrl: string;
}) {
  const [displayUrl, setDisplayUrl] = useState(initialUrl);
  const [triedFallback, setTriedFallback] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return <SkeletonImage className={className || "h-48 w-full rounded-xl"} />;
  }

  const showLoading = !imageLoaded;

  return (
    <div className={`relative overflow-hidden bg-white ${className || "h-48 w-full rounded-xl"}`}>
      {showLoading && (
        <SkeletonImage className="absolute inset-0 h-full w-full" showSpinner />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayUrl}
        alt={alt}
        className={`h-full w-full object-cover ${showLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          if (triedFallback) {
            setImageFailed(true);
            return;
          }
          const fallback = assetUrlFallback(src);
          if (fallback) {
            setTriedFallback(true);
            setDisplayUrl(withCacheBust(fallback, undefined));
            setImageLoaded(false);
          } else {
            setImageFailed(true);
          }
        }}
      />
    </div>
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
  const initialUrl = useMemo(() => {
    const url = assetUrl(src);
    return url ? withCacheBust(url, cacheBust) : null;
  }, [src, cacheBust]);

  if (!initialUrl) return null;

  return (
    <ProductImageInner
      key={`${src}-${cacheBust ?? 0}`}
      src={src}
      alt={alt}
      className={className}
      initialUrl={initialUrl}
    />
  );
}
