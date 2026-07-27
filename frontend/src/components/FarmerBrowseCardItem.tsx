"use client";

import { FarmerBrowseCard } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { Icon } from "@/components/icons";

interface FarmerBrowseCardItemProps {
  farmer: FarmerBrowseCard;
  onClick: () => void;
  accessPriceLabel?: string | null;
  embedded?: boolean;
}

function AccessStatusBadge({
  farmer,
  accessPriceLabel,
}: {
  farmer: FarmerBrowseCard;
  accessPriceLabel?: string | null;
}) {
  if (farmer.hasFarmAccess && farmer.connectionStatus === "ACCEPTED") {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Access approved
      </span>
    );
  }
  if (farmer.hasFarmAccess && farmer.connectionStatus === "PENDING") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
        Pending approval
      </span>
    );
  }
  if (farmer.canViewProducts) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Products available
      </span>
    );
  }
  const label = farmer.farmAccessPriceLabel ?? accessPriceLabel;
  if (label) {
    return (
      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
        {label} access
      </span>
    );
  }
  return null;
}

export function FarmerBrowseCardItem({
  farmer,
  onClick,
  accessPriceLabel,
  embedded = false,
}: FarmerBrowseCardItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full flex-col text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        embedded
          ? "rounded-xl p-1 hover:bg-brand-50/60"
          : "overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-sm hover:border-brand-200 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <AvatarWithVerification
          src={farmer.profilePicture}
          name={farmer.farmerName}
          size="lg"
          verificationStatus={farmer.verificationStatus}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-brand-900">{farmer.farmerName}</h3>
          <p className="truncate text-sm text-brand-700">{farmer.farmName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <CountryBadge country={farmer.country} region={farmer.region} />
          </div>
        </div>

      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <AccessStatusBadge farmer={farmer} accessPriceLabel={accessPriceLabel} />
        <span className="text-xs text-brand-500 opacity-0 transition group-hover:opacity-100">
          View details
        </span>
      </div>
    </button>
  );
}
