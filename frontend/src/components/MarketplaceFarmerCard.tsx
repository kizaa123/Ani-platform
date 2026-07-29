"use client";

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

export function MarketplaceFarmerCard({
  farmer,
  accessPriceLabel,
  onPayToAccess,
  onViewFarm,
}: MarketplaceFarmerCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <AvatarWithVerification
          src={farmer.profilePicture}
          name={farmer.farmerName}
          size="lg"
          verificationStatus={farmer.verificationStatus}
          verificationTags={farmer.verificationTags}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-brand-900">{farmer.farmerName}</h3>
          {farmer.farmName && (
            <p className="truncate text-sm text-brand-700">{farmer.farmName}</p>
          )}
          <div className="mt-1.5">
            <CountryBadge country={farmer.country} region={farmer.region} />
          </div>
        </div>
      </div>

      {farmer.registeredCommodities.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Commodities
          </p>
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
        </div>
      )}

      {farmer.farmSize && (
        <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Farm size</p>
          <p className="mt-0.5 text-sm font-semibold text-brand-900">{farmer.farmSize}</p>
        </div>
      )}

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
