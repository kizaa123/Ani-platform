"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FarmerBrowseCard, MarketplaceBrowse, isBuyer } from "@/lib/types";
import { FarmAccessPaymentModal } from "@/components/FarmAccessPaymentModal";
import { FarmerBrowseCardItem } from "@/components/FarmerBrowseCardItem";
import { FarmerDetailModal } from "@/components/FarmerDetailModal";
import { Icon } from "@/components/icons";

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
  const [detailFarmer, setDetailFarmer] = useState<FarmerBrowseCard | null>(null);

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
      "Payment received! ANI admin will review your access request. You can view products once approved."
    );
    loadBrowse();
  };

  const openAccessPayment = (farmer: FarmerBrowseCard) => {
    setDetailFarmer(null);
    setPayFarmer(farmer);
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
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farmers or commodities..."
            className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        {search.trim() && (
          <p className="mt-2 text-sm text-gray-500">
            {filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {filteredFarmers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 p-12 text-center text-gray-500">
          {search.trim() ? "No farmers match your search." : "No farmers registered yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFarmers.map((farmer) => (
            <FarmerBrowseCardItem
              key={farmer.farmerId}
              farmer={farmer}
              accessPriceLabel={browse?.farmAccessPriceLabel}
              onClick={() => setDetailFarmer(farmer)}
            />
          ))}
        </div>
      )}

      {detailFarmer && (
        <FarmerDetailModal
          farmer={detailFarmer}
          farmAccessPriceLabel={browse?.farmAccessPriceLabel}
          onClose={() => setDetailFarmer(null)}
          onAccessFarm={
            !detailFarmer.hasFarmAccess
              ? () => openAccessPayment(detailFarmer)
              : undefined
          }
        />
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
