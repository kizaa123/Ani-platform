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
  compact?: boolean;
  imageClassName?: string;
  contentClassName?: string;
}

export function FarmerProductCard({
  product,
  onClick,
  active,
  compact = false,
  imageClassName,
  contentClassName,
}: FarmerProductCardProps) {
  const thumb = productMediaThumbnail(product);
  const isVideo = productMediaIsVideo(product);

  const hasHarvestInfo = Boolean(
    product.harvestStartDate || product.harvestEndDate || product.harvestLabel
  );

  const resolvedImageClass =
    imageClassName ??
    (compact ? "h-16 w-16 shrink-0 object-cover" : "h-44 w-full object-cover");
  const resolvedContentClass = contentClassName ?? (compact ? "min-w-0 flex-1 p-2" : "p-3");

  const cardShellClass = `group w-full overflow-hidden transition-all hover:border-brand-300 hover:shadow-md ${
    compact ? "rounded-lg border" : "rounded-xl border"
  } ${
    active
      ? "border-brand-500 ring-2 ring-brand-400 shadow-md"
      : "border-brand-100"
  }`;

  const availabilityBadge = (
    <span
      className={`shrink-0 rounded-full font-bold uppercase ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      } ${product.available ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
    >
      {product.available ? "Available" : "Unavailable"}
    </span>
  );

  const priceLabel =
    product.priceLabel ||
    `GHC ${product.price}/${formatListingUnit(product.unit ?? "bags")}`;

  const renderMedia = () => {
    if (thumb) {
      return (
        <div className={`relative ${compact ? "shrink-0" : ""}`}>
          {isVideo ? (
            <>
              <video
                src={assetUrl(thumb) ?? undefined}
                className={resolvedImageClass}
                muted
                playsInline
                preload="metadata"
              />
              <span
                className={`absolute rounded bg-black/50 text-white ${
                  compact ? "bottom-1 right-1 px-1 py-0.5 text-[8px]" : "bottom-2 right-2 px-1.5 py-0.5 text-[10px]"
                }`}
              >
                VIDEO
              </span>
            </>
          ) : (
            <ProductImage src={thumb} alt={product.title} className={resolvedImageClass} />
          )}
        </div>
      );
    }

    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 ${resolvedImageClass}`}
      >
        <Icon name="wheat" className={compact ? "h-5 w-5 text-brand-400" : "h-10 w-10 text-brand-400"} />
      </div>
    );
  };

  if (compact) {
    return (
      <div className={cardShellClass}>
        <button type="button" onClick={onClick} className="flex w-full items-stretch text-left">
          {renderMedia()}
          <div className={resolvedContentClass}>
            <div className="flex items-start justify-between gap-1.5">
              <h4 className="line-clamp-1 text-sm font-semibold text-brand-900 group-hover:text-brand-700">
                {product.title}
              </h4>
              {availabilityBadge}
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-brand-800">{priceLabel}</p>
              {hasHarvestInfo && (
                <HarvestCalendarTrigger
                  harvestStartDate={product.harvestStartDate}
                  harvestEndDate={product.harvestEndDate}
                  harvestLabel={product.harvestLabel}
                  commodityName={product.commodity?.name}
                  productTitle={product.title}
                  showLabel={false}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
                  iconClassName="h-3.5 w-3.5"
                />
              )}
            </div>
            {product.available && product.quantity != null && (
              <p className="mt-0.5 text-[10px] text-gray-500">
                {product.quantity} {formatListingUnit(product.unit ?? "bags")} left
              </p>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={cardShellClass}>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
      >
      {renderMedia()}
      <div className={resolvedContentClass}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 font-semibold text-brand-900 group-hover:text-brand-700">
            {product.title}
          </h4>
          {availabilityBadge}
        </div>
        <p className="mt-1 text-sm font-bold text-brand-800">
          {priceLabel}
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
            showLabel={false}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
            iconClassName="h-4 w-4"
          />
        </div>
      )}
    </div>
  );
}
