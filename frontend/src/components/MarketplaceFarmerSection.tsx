"use client";

import Link from "next/link";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { FarmerProductCard } from "@/components/FarmerProductCard";
import { Icon } from "@/components/icons";
import { FarmerBrowseCard, isResearcher, Listing } from "@/lib/types";

interface MarketplaceFarmerSectionProps {
  farmer: FarmerBrowseCard;
  farmAccessPriceLabel?: string | null;
  showAccessPanel: boolean;
  userRoleId: number;
  onProductClick: (product: Listing) => void;
}

function LockedAccessPanel({ accessLabel }: { accessLabel: string }) {
  return (
    <div className="border-t border-brand-100/70 bg-gradient-to-br from-brand-50/70 via-white to-brand-50/30 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex items-start gap-3 md:items-center md:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 md:h-11 md:w-11"
            aria-hidden
          >
            <Icon name="lock" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-900">
              Products hidden until access is granted
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500 md:text-sm">
              Unlock this farm to browse listings, view prices, and place orders.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 md:shrink-0 md:items-end md:text-right">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              One-time access
            </p>
            <p className="text-xl font-bold tabular-nums text-brand-900 md:text-2xl">{accessLabel}</p>
          </div>
          <Link
            href="/access"
            className="btn-gold inline-flex items-center justify-center gap-2 px-5 py-2.5 md:px-6"
          >
            <Icon name="credit-card" className="h-4 w-4 shrink-0" />
            <span className="md:hidden">Pay to Access Farm</span>
            <span className="hidden md:inline">Get Access</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PendingAccessPanel({ userRoleId }: { userRoleId: number }) {
  const href = isResearcher(userRoleId) ? "/access" : "/connections";
  const linkText = isResearcher(userRoleId)
    ? "View farm access status"
    : "View connection status";

  return (
    <div className="border-t border-amber-100/80 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/25 px-4 py-4 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex items-start gap-3 md:items-center md:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"
            aria-hidden
          >
            <Icon name="clock" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950">Awaiting admin approval</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-900/75 md:text-sm">
              Payment received — your farm access request is being reviewed.
            </p>
          </div>
        </div>
        <Link href={href} className="btn-outline shrink-0 px-5 py-2.5 text-center md:w-auto">
          {linkText}
        </Link>
      </div>
    </div>
  );
}

export function MarketplaceFarmerSection({
  farmer,
  farmAccessPriceLabel,
  showAccessPanel,
  userRoleId,
  onProductClick,
}: MarketplaceFarmerSectionProps) {
  const accessLabel = farmer.farmAccessPriceLabel ?? farmAccessPriceLabel ?? "—";
  const isLocked = !farmer.canViewProducts && showAccessPanel;
  const isPending = isLocked && farmer.hasFarmAccess && farmer.connectionStatus === "PENDING";
  const avatarSize = isLocked ? "sm" : "md";

  return (
    <section className="card-elevated overflow-hidden rounded-2xl">
      <div
        className={`px-4 py-3 sm:px-5 ${isLocked ? "sm:py-3" : "sm:py-4"} ${!isLocked && farmer.canViewProducts ? "border-b border-brand-50" : ""}`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <AvatarWithVerification
            src={farmer.profilePicture}
            name={farmer.farmerName}
            size={avatarSize}
            verificationStatus={farmer.verificationStatus}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3
                className={`min-w-0 truncate font-bold text-brand-900 ${isLocked ? "text-base sm:text-lg" : "sm:pt-1"}`}
              >
                {farmer.farmerName}
              </h3>
              {isLocked && !isPending && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                  <Icon name="lock" className="h-3 w-3" />
                  Locked
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  <Icon name="clock" className="h-3 w-3" />
                  Pending
                </span>
              )}
            </div>
            {(isLocked || farmer.farmName) && (
              <p className="truncate text-sm text-brand-700">{farmer.farmName}</p>
            )}
            {isLocked && (
              <div className="mt-1">
                <CountryBadge country={farmer.country} region={farmer.region} />
              </div>
            )}
          </div>
        </div>
      </div>

      {farmer.canViewProducts ? (
        farmer.products.length > 0 ? (
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
        )
      ) : isLocked ? (
        isPending ? (
          <PendingAccessPanel userRoleId={userRoleId} />
        ) : (
          <LockedAccessPanel accessLabel={accessLabel} />
        )
      ) : null}
    </section>
  );
}
