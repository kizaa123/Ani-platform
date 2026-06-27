"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FarmerBrowseCard, MarketplaceBrowse, isBuyer } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { FarmAccessPaymentModal } from "@/components/FarmAccessPaymentModal";

function filterFarmers(farmers: FarmerBrowseCard[], query: string): FarmerBrowseCard[] {
  const term = query.trim().toLowerCase();
  if (!term) return farmers;
  return farmers.filter((f) => (f.searchTerms ?? "").includes(term));
}

export default function AccessPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [browse, setBrowse] = useState<MarketplaceBrowse | null>(null);
  const [search, setSearch] = useState("");
  const [payFarmer, setPayFarmer] = useState<FarmerBrowseCard | null>(null);

  const loadBrowse = useCallback(() => {
    api.marketplace.browse().then(setBrowse).catch(console.error);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isBuyer(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) loadBrowse();
  }, [user?.id, loading, router, loadBrowse]);

  const filteredFarmers = useMemo(
    () => filterFarmers(browse?.farmers ?? [], search),
    [browse?.farmers, search]
  );

  const onPaymentSuccess = () => {
    alert(
      "Payment received! The farmer will review your request on their Connections page. You can view products once they approve."
    );
    loadBrowse();
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <Link href="/marketplace" className="text-sm text-brand-600 hover:underline">
          ← Back to Marketplace
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Buyer Access</h1>
        <p className="text-gray-500">
          Browse registered farmers and pay to access each farm&apos;s products, prices, and purchase
          options
        </p>
      </div>

      <div className="mb-8">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farmers or commodities..."
            className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      {filteredFarmers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 p-12 text-center text-gray-500">
          {search.trim() ? "No farmers match your search." : "No farmers registered yet."}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFarmers.map((farmer) => (
            <div
              key={farmer.farmerId}
              className="flex flex-col rounded-2xl border border-brand-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <FarmerAvatar
                  src={farmer.profilePicture}
                  name={farmer.farmerName}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-brand-900">{farmer.farmerName}</h3>
                  <p className="truncate text-sm text-brand-700">{farmer.farmName}</p>
                  <CountryBadge country={farmer.country} region={farmer.region} />
                </div>
              </div>

              {farmer.farmSize && (
                <div className="mt-4 rounded-xl bg-brand-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-gray-500">Farm size</p>
                  <p className="font-semibold text-brand-900">{farmer.farmSize}</p>
                </div>
              )}

              {farmer.registeredCommodities.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Commodities registered
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {farmer.registeredCommodities.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full border border-brand-100 bg-white px-2.5 py-0.5 text-xs text-brand-800"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-5">
                {farmer.hasFarmAccess && farmer.connectionStatus === "ACCEPTED" ? (
                  <div className="space-y-2">
                    <span className="block w-full rounded-xl bg-green-100 py-2.5 text-center text-sm font-semibold text-green-800">
                      ✓ Farm access approved
                    </span>
                    <Link
                      href="/marketplace"
                      className="btn-primary block w-full py-2.5 text-center"
                    >
                      View Farm Products
                    </Link>
                  </div>
                ) : farmer.hasFarmAccess && farmer.connectionStatus === "PENDING" ? (
                  <div className="space-y-2">
                    <span className="block w-full rounded-xl bg-amber-100 py-2.5 text-center text-sm font-semibold text-amber-900">
                      ⏳ Awaiting farmer approval
                    </span>
                    <Link
                      href="/connections"
                      className="btn-outline block w-full py-2.5 text-center"
                    >
                      View connection status
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 text-center">
                      <p className="text-xs font-semibold uppercase text-gray-500">Access fee</p>
                      <p className="text-2xl font-bold text-brand-900">
                        {farmer.farmAccessPriceLabel ?? "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayFarmer(farmer)}
                      className="btn-gold w-full py-3"
                    >
                      Access Farm
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {payFarmer && (
        <FarmAccessPaymentModal
          farmer={payFarmer}
          onClose={() => setPayFarmer(null)}
          onSuccess={onPaymentSuccess}
        />
      )}
    </div>
  );
}
