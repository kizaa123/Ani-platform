"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { FarmerBrowseCard, isResearcher } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { Icon } from "@/components/icons";

interface FarmerDetailModalProps {
  farmer: FarmerBrowseCard;
  onClose: () => void;
  onAccessFarm?: () => void;
  farmAccessPriceLabel?: string | null;
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 font-semibold text-brand-900">{value}</p>
    </div>
  );
}

export function FarmerDetailModal({
  farmer,
  onClose,
  onAccessFarm,
  farmAccessPriceLabel,
}: FarmerDetailModalProps) {
  const { user } = useAuth();
  const pendingStatusHref = user && isResearcher(user.roleId) ? "/access" : "/connections";
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const accessLabel =
    farmer.farmAccessPriceLabel ?? farmAccessPriceLabel ?? "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <AvatarWithVerification
                src={farmer.profilePicture}
                name={farmer.farmerName}
                size="lg"
                verificationStatus={farmer.verificationStatus}
              />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-brand-900">{farmer.farmerName}</h2>
                <p className="text-sm font-medium text-brand-700">{farmer.farmName}</p>
                <CountryBadge country={farmer.country} region={farmer.region} className="mt-1.5" />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-700"
              aria-label="Close"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {farmer.city && <DetailTile label="City" value={farmer.city} />}
            {farmer.farmSize && <DetailTile label="Farm size" value={farmer.farmSize} />}
            {farmer.products.length > 0 && (
              <DetailTile
                label="Products listed"
                value={`${farmer.products.length}`}
              />
            )}
          </div>

          {farmer.registeredCommodities.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Commodities registered
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
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

          <div className="mt-6 space-y-2">
            {farmer.hasFarmAccess && farmer.connectionStatus === "ACCEPTED" ? (
              <>
                <span className="block w-full rounded-xl bg-green-100 py-2.5 text-center text-sm font-semibold text-green-800">
                  ✓ Farm access approved
                </span>
                <Link
                  href="/marketplace"
                  className="btn-primary block w-full py-2.5 text-center"
                  onClick={onClose}
                >
                  View Farm Products
                </Link>
              </>
            ) : farmer.hasFarmAccess && farmer.connectionStatus === "PENDING" ? (
              <>
                <span className="block w-full rounded-xl bg-amber-100 py-2.5 text-center text-sm font-semibold text-amber-900">
                  ⏳ Awaiting ANI admin approval
                </span>
                <Link
                  href={pendingStatusHref}
                  className="btn-outline block w-full py-2.5 text-center"
                  onClick={onClose}
                >
                  {user && isResearcher(user.roleId) ? "View farm access status" : "View connection status"}
                </Link>
              </>
            ) : onAccessFarm ? (
              <>
                <div className="rounded-xl bg-brand-900 p-4 text-center text-white">
                  <p className="text-xs uppercase tracking-wide text-brand-300">Access fee</p>
                  <p className="text-2xl font-bold">{accessLabel}</p>
                </div>
                <button type="button" onClick={onAccessFarm} className="btn-gold w-full py-3">
                  Access Farm
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Farm access fee
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-900">{accessLabel}</p>
                </div>
                <Link
                  href="/access"
                  className="btn-gold block w-full py-2.5 text-center"
                  onClick={onClose}
                >
                  Pay to Access Farm
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
