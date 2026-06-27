"use client";

import { Listing, formatListingUnit } from "@/lib/types";
import { ProductImage } from "@/components/FarmerAvatar";

interface FarmerProductCardProps {
  product: Listing;
  onClick: () => void;
  active?: boolean;
}

export function FarmerProductCard({ product, onClick, active }: FarmerProductCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left rounded-xl border overflow-hidden transition-all hover:border-brand-300 hover:shadow-md ${
        active
          ? "border-brand-500 ring-2 ring-brand-400 shadow-md"
          : "border-brand-100"
      }`}
    >
      {product.images?.[0] ? (
        <ProductImage
          src={product.images[0]}
          alt={product.title}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
          <span className="text-3xl">🌾</span>
        </div>
      )}
      <div className="p-3">
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
        {product.harvestLabel && (
          <p className="mt-1 text-xs text-brand-700 line-clamp-1">
            📅 {product.harvestLabel}
          </p>
        )}
      </div>
    </button>
  );
}
