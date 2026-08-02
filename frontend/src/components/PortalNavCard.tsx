"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { SkeletonImage } from "@/components/LoadingPrimitives";

export type PortalNavCardProps = {
  href: string;
  title: string;
  desc: string;
  icon: IconName;
  image: string;
};

/** Image-backed navigation card - matches homepage role card styling. */
export function PortalNavCard({ href, title, desc, icon, image }: PortalNavCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      href={href}
      className="group card-elevated card-elevated-hover flex cursor-pointer flex-col overflow-hidden rounded-2xl"
    >
      <div className="portal-nav-card-image relative h-40 w-full overflow-hidden bg-white">
        {!imageLoaded && !imageFailed && (
          <SkeletonImage className="absolute inset-0 h-full w-full" showSpinner />
        )}
        {imageFailed ? (
          <SkeletonImage className="absolute inset-0 h-full w-full" />
        ) : (
          <Image
            src={image}
            alt={title}
            fill
            className={`object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-brand-900/60 via-brand-900/20 to-transparent" />
        <div className="absolute bottom-3 left-3 z-[3] flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-brand-700 shadow-[0_1px_2px_rgba(27,67,50,0.06)] backdrop-blur-sm transition-colors group-hover:bg-brand-700 group-hover:text-white">
          <Icon name={icon} className="h-4 w-4" />
        </div>
      </div>
      <div className="portal-nav-card-body flex flex-col gap-0.5 bg-white p-4 md:gap-2 md:p-5">
        <h3 className="font-bold text-brand-900 group-hover:text-brand-700">{title}</h3>
        <p className="text-sm leading-snug text-gray-500 md:leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}

/** Compact loading card for dashboard grid while auth resolves */
export function PortalNavCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <SkeletonImage className="h-40 w-full" />
      <div className="space-y-2 p-4 md:p-5">
        <div className="h-5 w-2/3 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
