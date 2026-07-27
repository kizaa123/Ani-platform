"use client";

import { Listing, formatListingUnit } from "@/lib/types";
import { ProductImage } from "@/components/FarmerAvatar";
import { productMediaIsVideo, productMediaThumbnail } from "@/components/ProductMediaGallery";
import { assetUrl } from "@/lib/assetUrl";
import { Icon } from "@/components/icons";
import { HarvestCalendarTrigger } from "@/components/HarvestCalendarTrigger";

interface FarmerProductCardProps {
  product: Listing;
  onClick: () => void;
  active?: boolean;
  imageClassName?: string;
  contentClassName?: string;
}

export function FarmerProductCard({
  product,
  onClick,
  active,
  imageClassName = "h-44 w-full object-cover",
  contentClassName = "p-3",
}: FarmerProductCardProps) {
  const thumb = productMediaThumbnail(product);
  const isVideo = productMediaIsVideo(product);

  const hasHarvestInfo = Boolean(
    product.harvestStartDate || product.harvestEndDate || product.harvestLabel
  );

  return (
    <div
      className={`group w-full rounded-xl border overflow-hidden transition-all hover:border-brand-300 hover:shadow-md ${
        active
          ? "border-brand-500 ring-2 ring-brand-400 shadow-md"
          : "border-brand-100"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
      >
      {thumb ? (
        <div className="relative">
          {isVideo ? (
            <>
              <video
                src={assetUrl(thumb) ?? undefined}
                className={imageClassName}
                muted
                playsInline
                preload="metadata"
              />
              <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                VIDEO
              </span>
            </>
          ) : (
            <ProductImage
              src={thumb}
              alt={product.title}
              className={imageClassName}
            />
          )}
        </div>
      ) : (
        <div
          className={`flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 ${imageClassName}`}
        >
          <Icon name="wheat" className="h-10 w-10 text-brand-400" />
        </div>
      )}
      <div className={contentClassName}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 font-semibold text-brand-900 group-hover:text-brand-700">
            {product.title}
          </h4>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              product.available ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {product.available ? "Available" : "Unavailable"}
          </span>
        </div>
        <p className="mt-1 text-sm font-bold text-brand-800">
          {product.priceLabel ||
            `GHC ${product.price}/${formatListingUnit(product.unit ?? "bags")}`}
        </p>
        {product.available && product.quantity != null && (
          <p className="text-xs text-gray-500">
            {product.quantity} {formatListingUnit(product.unit ?? "bags")} left
          </p>
        )}
      </div>
      </button>
      {hasHarvestInfo && (
        <div className="border-t border-brand-50 px-3 pb-2 pt-1">
          <HarvestCalendarTrigger
            harvestStartDate={product.harvestStartDate}
            harvestEndDate={product.harvestEndDate}
            harvestLabel={product.harvestLabel}
            commodityName={product.commodity?.name}
            productTitle={product.title}
            className="inline-flex w-full items-center gap-1 rounded-lg px-1 py-1 text-xs text-brand-700 hover:bg-brand-50"
          />
        </div>
      )}
    </div>
  );
}
