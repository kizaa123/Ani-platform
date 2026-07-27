"use client";

import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { FarmerProductCard } from "@/components/FarmerProductCard";
import { FarmerBrowseCard, Listing } from "@/lib/types";

interface MarketplaceFarmerSectionProps {
  farmer: FarmerBrowseCard;
  onProductClick: (product: Listing) => void;
}

export function MarketplaceFarmerSection({
  farmer,
  onProductClick,
}: MarketplaceFarmerSectionProps) {
  return (
    <section className="card-elevated overflow-hidden rounded-2xl">
      <div className="border-b border-brand-50 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <AvatarWithVerification
            src={farmer.profilePicture}
            name={farmer.farmerName}
            size="md"
            verificationStatus={farmer.verificationStatus}
          />
          <div className="min-w-0 flex-1">
            <h3 className="min-w-0 truncate font-bold text-brand-900 sm:pt-1">
              {farmer.farmerName}
            </h3>
            {farmer.farmName && (
              <p className="truncate text-sm text-brand-700">{farmer.farmName}</p>
            )}
          </div>
        </div>
      </div>

      {farmer.products.length > 0 ? (
        <div className="p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Products ({farmer.products.length})
          </p>
          <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-1 snap-x snap-mandatory scrollbar-hide sm:gap-6">
            {farmer.products.map((product) => (
              <div key={product.id} className="w-72 shrink-0 snap-start sm:w-80">
                <FarmerProductCard
                  product={product}
                  onClick={() => onProductClick(product)}
                  imageClassName="h-44 w-full object-cover sm:h-52 md:h-56"
                  contentClassName="p-4"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-brand-50 px-4 py-6 text-center text-sm text-gray-500 sm:px-5">
          No products listed yet from this farm.
        </div>
      )}
    </section>
  );
}
