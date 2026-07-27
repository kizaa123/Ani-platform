"use client";

import { ImageLoader } from "@/components/LoadingPrimitives";
import { Icon } from "@/components/icons";
import { assetUrl } from "@/lib/assetUrl";

type PublicationCoverImageProps = {
  coverImage?: string | null;
  title?: string;
  className?: string;
  aspectClass?: string;
};

export function PublicationCoverImage({
  coverImage,
  title,
  className = "",
  aspectClass = "aspect-video",
}: PublicationCoverImageProps) {
  const src = coverImage ? assetUrl(coverImage) : null;

  return (
    <div
      className={`relative w-full overflow-hidden bg-white ${aspectClass} ${className}`}
    >
      {src ? (
        <ImageLoader
          src={src}
          alt={title ? `${title} cover` : "Publication cover"}
          className="h-full w-full"
          containerClassName="relative h-full w-full"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100">
          <Icon name="book" className="h-12 w-12 text-gray-300" />
        </div>
      )}
    </div>
  );
}
