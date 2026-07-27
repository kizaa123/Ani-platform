"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FarmerBrowseCard, MarketplaceBrowse, isMarketplaceBuyer } from "@/lib/types";
import { FarmAccessPaymentModal } from "@/components/FarmAccessPaymentModal";
import { FarmerBrowseCardItem } from "@/components/FarmerBrowseCardItem";
import { FarmerDetailModal } from "@/components/FarmerDetailModal";
import { Icon } from "@/components/icons";

function filterFarmers(farmers: FarmerBrowseCard[], query: string): FarmerBrowseCard[] {
  const term = query.trim().toLowerCase();
  if (!term) return farmers;
  return farmers.filter((f) => (f.searchTerms ?? "").toLowerCase().includes(term));
}

function getFarmerCategoryGroup(farmer: FarmerBrowseCard) {
  const commodities = farmer.registeredCommodities ?? [];
  const products = farmer.products ?? [];

  const livestockKeywords = [
    "livestock", "poultry", "cattle", "cow", "goat", "sheep", "pig", "swine",
    "chicken", "turkey", "egg", "eggs", "meat", "dairy", "animal"
  ];

  let isLivestock = false;
  let isCrop = false;

  for (const c of commodities) {
    const cat = (c.category ?? "").toLowerCase();
    const name = (c.name ?? "").toLowerCase();
    if (cat.includes("livestock") || livestockKeywords.some((k) => name.includes(k) || cat.includes(k))) {
      isLivestock = true;
    } else {
      isCrop = true;
    }
  }

  for (const p of products) {
    const title = (p.title ?? "").toLowerCase();
    const cat = (p.commodity?.category?.name ?? "").toLowerCase();
    const name = (p.commodity?.name ?? "").toLowerCase();
    if (cat.includes("livestock") || livestockKeywords.some((k) => name.includes(k) || cat.includes(k) || title.includes(k))) {
      isLivestock = true;
    } else {
      isCrop = true;
    }
  }

  if (!isLivestock && !isCrop) {
    isCrop = true;
  }

  return { isCrop, isLivestock };
}

function FarmerRowSection({
  title,
  subtitle,
  farmers,
  browse,
  onSelectFarmer,
}: {
  title: string;
  subtitle: string;
  farmers: FarmerBrowseCard[];
  browse: MarketplaceBrowse | null;
  onSelectFarmer: (farmer: FarmerBrowseCard) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const scrollAmount = direction === "left" ? -360 : 360;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (farmers.length === 0) return null;

  return (
    <div className="mb-10 rounded-2xl border border-brand-100/80 bg-white/70 p-5 shadow-xs backdrop-blur-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-900">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>

        {/* Scroll controls */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label={`Scroll ${title} left`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-xs transition hover:bg-brand-100 hover:text-brand-900 active:scale-95"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label={`Scroll ${title} right`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-xs transition hover:bg-brand-100 hover:text-brand-900 active:scale-95"
          >
            <Icon name="chevron-right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Row - auto x-axis hidden scrollbar */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {farmers.map((farmer) => (
          <div key={farmer.farmerId} className="w-[280px] shrink-0 sm:w-[320px]">
            <FarmerBrowseCardItem
              farmer={farmer}
              accessPriceLabel={browse?.farmAccessPriceLabel}
              onClick={() => onSelectFarmer(farmer)}
            />
          </div>
        ))}
      </div>
    </div>
  );
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
    if (user && !isMarketplaceBuyer(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) loadBrowse();
  }, [user?.id, loading, router, loadBrowse]);

  const filteredFarmers = useMemo(
    () => filterFarmers(browse?.farmers ?? [], search),
    [browse?.farmers, search]
  );

  const cropFarmers = useMemo(
    () => filteredFarmers.filter((f) => getFarmerCategoryGroup(f).isCrop),
    [filteredFarmers]
  );

  const livestockFarmers = useMemo(
    () => filteredFarmers.filter((f) => getFarmerCategoryGroup(f).isLivestock),
    [filteredFarmers]
  );

  const onPaymentSuccess = () => {
    loadBrowse();
  };

  const openAccessPayment = (farmer: FarmerBrowseCard) => {
    setDetailFarmer(null);
    setPayFarmer(farmer);
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading buyer access...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <Link href="/marketplace" className="text-sm font-medium text-brand-600 hover:underline">
          Back to Marketplace
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Buyer Access</h1>
        <p className="text-gray-500">
          Browse registered farmers grouped by Crop Farmers and Livestock Farmers, and pay to access each farm&apos;s products and prices.
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
            className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        {search.trim() && (
          <p className="mt-2 text-sm text-gray-500">
            {filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? "s" : ""} found for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {filteredFarmers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 p-12 text-center text-gray-500">
          {search.trim() ? "No farmers match your search query." : "No farmers registered yet."}
        </div>
      ) : (
        <div className="space-y-4">
          <FarmerRowSection
            title="Crop Farmers"
            subtitle="Farmers producing grains, cereals, vegetables, fruits, tubers, legumes, and spices."
            farmers={cropFarmers}
            browse={browse}
            onSelectFarmer={setDetailFarmer}
          />

          <FarmerRowSection
            title="Livestock Farmers"
            subtitle="Farmers producing poultry, cattle, goats, pigs, sheep, dairy, and eggs."
            farmers={livestockFarmers}
            browse={browse}
            onSelectFarmer={setDetailFarmer}
          />
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
