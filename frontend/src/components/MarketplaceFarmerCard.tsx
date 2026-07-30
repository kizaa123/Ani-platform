"use client";

import { useEffect, useState } from "react";
import { FarmerBrowseCard } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { Icon } from "@/components/icons";

interface MarketplaceFarmerCardProps {
  farmer: FarmerBrowseCard;
  accessPriceLabel?: string | null;
  onPayToAccess: (farmer: FarmerBrowseCard) => void;
  onViewFarm: (farmer: FarmerBrowseCard) => void;
}

function FarmActionButton({
  farmer,
  accessPriceLabel,
  onPayToAccess,
  onViewFarm,
}: MarketplaceFarmerCardProps) {
  if (farmer.canViewProducts) {
    return (
      <button
        type="button"
        onClick={() => onViewFarm(farmer)}
        className="btn-primary w-full py-2.5 text-sm"
      >
        View farm
      </button>
    );
  }

  if (farmer.hasFarmAccess && farmer.connectionStatus === "PENDING") {
    return (
      <span className="block w-full rounded-xl bg-amber-100 py-2.5 text-center text-sm font-semibold text-amber-900">
        Pending approval
      </span>
    );
  }

  const label = farmer.farmAccessPriceLabel ?? accessPriceLabel;
  return (
    <button
      type="button"
      onClick={() => onPayToAccess(farmer)}
      className="btn-gold inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
    >
      <Icon name="lock" className="h-4 w-4 shrink-0" />
      Pay to access{label ? ` (${label})` : ""}
    </button>
  );
}

function useMinWidth(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-brand-900">{value}</p>
    </div>
  );
}

export function MarketplaceFarmerCard({
  farmer,
  accessPriceLabel,
  onPayToAccess,
  onViewFarm,
}: MarketplaceFarmerCardProps) {
  const isDesktop = useMinWidth("(min-width: 640px)");
  const avatarSize = isDesktop ? "lg" : 112;
  const productCount = farmer.products.length;
  const productCountLabel = farmer.canViewProducts
    ? productCount === 0
      ? "No products listed"
      : `${productCount} product${productCount === 1 ? "" : "s"} listed`
    : farmer.hasFarmAccess && farmer.connectionStatus === "PENDING"
      ? "Pending approval"
      : "Hidden until access";

  return (
    <article className="card-elevated card-elevated-hover flex h-full flex-col overflow-hidden rounded-2xl p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <AvatarWithVerification
          src={farmer.profilePicture}
          name={farmer.farmerName}
          size={avatarSize}
          verificationStatus={farmer.verificationStatus}
          verificationTags={farmer.verificationTags}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-base font-bold text-brand-900 sm:text-lg">
            {farmer.farmerName}
          </h3>
          <p className="truncate text-sm font-medium text-brand-700">
            {farmer.farmName || "Farm name not set"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</p>
        <div className="mt-1.5">
          <CountryBadge country={farmer.country} region={farmer.region} />
        </div>
      </div>

      <div className="mt-4 min-h-[4.5rem]">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Commodities</p>
        {farmer.registeredCommodities.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {farmer.registeredCommodities.map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800"
              >
                {c.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-gray-500">No commodities registered</p>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DetailTile label="Farm size" value={farmer.farmSize || "Not specified"} />
        <DetailTile label="Products" value={productCountLabel} />
      </div>

      <div className="mt-auto pt-4">
        <FarmActionButton
          farmer={farmer}
          accessPriceLabel={accessPriceLabel}
          onPayToAccess={onPayToAccess}
          onViewFarm={onViewFarm}
        />
      </div>
    </article>
  );
}
