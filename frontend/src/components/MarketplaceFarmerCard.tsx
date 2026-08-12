"use client";

import { useEffect, useState } from "react";
import { FarmerBrowseCard, ROLES } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { RolePrefixedName, splitDisplayName } from "@/components/RolePrefixedName";
import { Icon } from "@/components/icons";

interface MarketplaceFarmerCardProps {
  farmer: FarmerBrowseCard;
  accessPriceLabel?: string | null;
  onPayToAccess: (farmer: FarmerBrowseCard) => void;
  onViewFarm: (farmer: FarmerBrowseCard) => void;
}

function canViewProduction(farmer: FarmerBrowseCard): boolean {
  return farmer.canViewProducts;
}

function FarmActionButton({
  farmer,
  accessPriceLabel,
  onPayToAccess,
  onViewFarm,
}: MarketplaceFarmerCardProps) {
  if (canViewProduction(farmer)) {
    return (
      <button
        type="button"
        onClick={() => onViewFarm(farmer)}
        className="btn-primary w-full py-2.5 text-sm"
      >
        View production
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

  if (farmer.farmAccessExpired || farmer.requiresFarmAccessPayment) {
    const label = farmer.farmAccessPriceLabel ?? accessPriceLabel;
    const payLabel = farmer.farmAccessExpired ? "Renew access" : "Pay to access";

    return (
      <button
        type="button"
        onClick={() => onPayToAccess(farmer)}
        className="btn-gold inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
      >
        <Icon name="lock" className="h-4 w-4 shrink-0" />
        {payLabel}
        {label ? ` (${label})` : ""}
      </button>
    );
  }

  if (farmer.hasAvailableProduct === false) {
    return (
      <span className="block w-full rounded-xl bg-gray-100 py-2.5 text-center text-sm font-semibold text-gray-600">
        Product not available
      </span>
    );
  }

  const label = farmer.farmAccessPriceLabel ?? accessPriceLabel;
  const payLabel = farmer.farmAccessExpired ? "Renew access" : "Pay to access";

  return (
    <button
      type="button"
      onClick={() => onPayToAccess(farmer)}
      className="btn-gold inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
    >
      <Icon name="lock" className="h-4 w-4 shrink-0" />
      {payLabel}
      {label ? ` (${label})` : ""}
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
  const avatarSize = isDesktop ? "xl" : "lg";
  const productCount = farmer.products.length;
  const productCountLabel =
    productCount === 0
      ? "No products listed"
      : `${productCount} product${productCount === 1 ? "" : "s"} listed`;
  const showUnavailableBadge = farmer.hasAvailableProduct === false;
  const { firstName, lastName } = splitDisplayName(farmer.farmerName);

  return (
    <article className="card-elevated card-elevated-hover flex h-full flex-col overflow-hidden rounded-2xl p-5">
      <div className="flex items-start gap-4 sm:gap-5">
        <AvatarWithVerification
          src={farmer.profilePicture}
          name={farmer.farmerName}
          size={avatarSize}
          verificationStatus={farmer.verificationStatus}
          verificationTags={farmer.verificationTags}
          tagPlacement="none"
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug text-brand-900 sm:text-base">
            <RolePrefixedName
              user={{
                roleId: ROLES.CROP_FARMER,
                firstName,
                lastName,
                verificationStatus: farmer.verificationStatus,
              }}
              verificationTags={farmer.verificationTags}
              nameClassName="font-bold text-brand-900"
              prefixClassName="font-bold text-brand-900"
            />
          </h3>
          <p className="truncate text-sm font-medium text-brand-700">
            {farmer.farmName || "Farm name not set"}
          </p>
          <CountryBadge
            country={farmer.country}
            region={farmer.region}
            city={farmer.city}
            stacked
            className="mt-1.5"
          />
        </div>
      </div>

      {showUnavailableBadge && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">
          <p className="text-sm font-semibold text-gray-700">Product not available</p>
          <p className="mt-0.5 text-xs text-gray-500">
            No active harvest or products are currently listed
          </p>
        </div>
      )}

      {farmer.farmAccessExpired && farmer.hasAvailableProduct && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-sm font-semibold text-amber-900">Access expired</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Harvest period ended or a new product was listed — pay again to access
          </p>
        </div>
      )}

      <div className="mt-4 min-h-[4.5rem]">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Commodities</p>
        {farmer.registeredCommodities.length > 0 || (farmer.customProducts?.length ?? 0) > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {farmer.registeredCommodities.map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800"
              >
                {c.name}
              </span>
            ))}
            {(farmer.customProducts ?? []).map((product, index) => (
              <span
                key={`custom-${product}-${index}`}
                className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800"
              >
                {product}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-gray-500">No commodities registered</p>
        )}
      </div>

      {canViewProduction(farmer) && (
        <div className="mt-3">
          <DetailTile label="Products" value={productCountLabel} />
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
