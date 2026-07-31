"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  FarmerBrowseCard,
  Listing,
  MarketplaceBrowse,
  isFarmerHandler,
  isBuyerHandler,
} from "@/lib/types";
import { MarketplaceFarmerCard } from "@/components/MarketplaceFarmerCard";
import { FarmAccessPaymentModal } from "@/components/FarmAccessPaymentModal";
import { PurchaseModal } from "@/components/PurchaseModal";
import { Icon } from "@/components/icons";
import { CardGridSkeleton, PageContentSkeleton } from "@/components/LoadingPrimitives";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { AdSlot } from "@/components/AdSlot";

function isVerifiedFarmer(farmer: FarmerBrowseCard): boolean {
  if (farmer.verificationStatus === "VERIFIED") return true;
  return farmer.verificationTags?.some((tag) => tag.tagType === "STANDARD") ?? false;
}

function sortMarketplaceFarmers(farmers: FarmerBrowseCard[]): FarmerBrowseCard[] {
  return [...farmers].sort((a, b) => {
    const verifiedDiff = Number(isVerifiedFarmer(b)) - Number(isVerifiedFarmer(a));
    if (verifiedDiff !== 0) return verifiedDiff;

    const aName = (a.farmName || a.farmerName).trim().toLowerCase();
    const bName = (b.farmName || b.farmerName).trim().toLowerCase();
    const byFarm = aName.localeCompare(bName);
    if (byFarm !== 0) return byFarm;

    return a.farmerName.localeCompare(b.farmerName);
  });
}

function filterFarmers(farmers: FarmerBrowseCard[], query: string): FarmerBrowseCard[] {
  const term = query.trim().toLowerCase();
  if (!term) return farmers;
  return farmers.filter((f) => (f.searchTerms ?? "").toLowerCase().includes(term));
}

function firstOrderableProduct(farmer: FarmerBrowseCard): Listing | null {
  const available = farmer.products.find(
    (p) => p.available !== false && (p.quantity ?? 0) > 0
  );
  return available ?? farmer.products[0] ?? null;
}

export default function MarketplacePage() {
  const { user, loading } = useAuth();
  const [browse, setBrowse] = useState<MarketplaceBrowse | null>(null);
  const [search, setSearch] = useState("");
  const [purchaseFarmer, setPurchaseFarmer] = useState<FarmerBrowseCard | null>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [payFarmer, setPayFarmer] = useState<FarmerBrowseCard | null>(null);
  const [orderPlacedMessage, setOrderPlacedMessage] = useState("");
  const [farmAccessMessage, setFarmAccessMessage] = useState("");
  const router = useRouter();

  const [browseLoading, setBrowseLoading] = useState(true);

  const loadBrowse = useCallback(() => {
    api.marketplace
      .browse()
      .then(setBrowse)
      .catch(console.error)
      .finally(() => setBrowseLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user && (isFarmerHandler(user.roleId) || isBuyerHandler(user.roleId))) {
      router.replace("/dashboard");
      return;
    }
    if (user) loadBrowse();
  }, [user?.id, user?.roleId, loading, router, loadBrowse]);

  const filteredFarmers = useMemo(
    () => sortMarketplaceFarmers(filterFarmers(browse?.farmers ?? [], search)),
    [browse?.farmers, search]
  );

  const openPurchase = (farmer: FarmerBrowseCard, product: Listing) => {
    setPurchaseFarmer(farmer);
    setActiveListingId(product.id);
  };

  const closePurchase = () => {
    setPurchaseFarmer(null);
    setActiveListingId(null);
  };

  const handleViewFarm = (farmer: FarmerBrowseCard) => {
    const product = firstOrderableProduct(farmer);
    if (!product) {
      setFarmAccessMessage(`${farmer.farmName || farmer.farmerName} has no products listed yet.`);
      return;
    }
    openPurchase(farmer, product);
  };

  const handleOrderSuccess = useCallback(() => {
    setBrowseLoading(true);
    loadBrowse();
    setOrderPlacedMessage("Order placed successfully!");
  }, [loadBrowse]);

  const handleAccessPaymentSuccess = () => {
    setBrowseLoading(true);
    loadBrowse();
  };

  useEffect(() => {
    if (!orderPlacedMessage) return;
    const timer = window.setTimeout(() => setOrderPlacedMessage(""), 8000);
    return () => window.clearTimeout(timer);
  }, [orderPlacedMessage]);

  useEffect(() => {
    if (!farmAccessMessage) return;
    const timer = window.setTimeout(() => setFarmAccessMessage(""), 6000);
    return () => window.clearTimeout(timer);
  }, [farmAccessMessage]);

  const activeListing = useMemo(() => {
    if (!purchaseFarmer || !activeListingId) return null;
    return purchaseFarmer.products.find((p) => p.id === activeListingId) ?? null;
  }, [purchaseFarmer, activeListingId]);

  useEffect(() => {
    if (!purchaseFarmer || !browse) return;
    const updated = browse.farmers.find((f) => f.farmerId === purchaseFarmer.farmerId);
    if (updated) setPurchaseFarmer(updated);
  }, [browse, purchaseFarmer?.farmerId]);

  if (loading) return <PageContentSkeleton />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <ScrollReveal trigger="mount" delay={0} duration={450} direction="fade-up" className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">Marketplace</h1>
        <p className="mt-1 text-sm text-gray-500">
          Discover fellows, pay for production access, and place orders
        </p>
        {!browseLoading && !search.trim() && filteredFarmers.length > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            {filteredFarmers.length} fellow{filteredFarmers.length !== 1 ? "s" : ""} available
          </p>
        )}
      </ScrollReveal>

      <AdSlot placement="marketplace" className="mb-8" />

      <ScrollReveal trigger="mount" delay={80} duration={450} direction="fade-up" className="mb-8">
        <label htmlFor="marketplace-search" className="sr-only">
          Search fellows, commodities, or products
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          />
          <input
            id="marketplace-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by fellow name, commodity, or product..."
            className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 text-sm text-brand-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        {search.trim() && (
          <p className="mt-2 text-sm text-gray-500">
            {filteredFarmers.length} fellow{filteredFarmers.length !== 1 ? "s" : ""} found
          </p>
        )}
      </ScrollReveal>

      {orderPlacedMessage && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
        >
          <Icon name="check" className="h-5 w-5 shrink-0 text-green-600" />
          {orderPlacedMessage}
        </div>
      )}

      {farmAccessMessage && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
        >
          {farmAccessMessage}
        </div>
      )}

      {browseLoading ? (
        <CardGridSkeleton count={6} columns="sm:grid-cols-2 lg:grid-cols-3" />
      ) : filteredFarmers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-12 text-center text-gray-500">
          {search.trim() ? "No fellows match your search." : "No fellows registered yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFarmers.map((farmer, index) => (
            <ScrollReveal
              key={farmer.farmerId}
              delay={scrollStagger(index, 70)}
              duration={450}
              direction="fade-up"
              className="h-full"
            >
              <MarketplaceFarmerCard
                farmer={farmer}
                accessPriceLabel={browse?.farmAccessPriceLabel}
                onPayToAccess={setPayFarmer}
                onViewFarm={handleViewFarm}
              />
            </ScrollReveal>
          ))}
        </div>
      )}

      {payFarmer && (
        <FarmAccessPaymentModal
          farmer={payFarmer}
          onClose={() => setPayFarmer(null)}
          onSuccess={handleAccessPaymentSuccess}
        />
      )}

      {purchaseFarmer && activeListing && (
        <PurchaseModal
          listing={activeListing}
          relatedProducts={purchaseFarmer.products}
          farmerId={purchaseFarmer.farmerId}
          farmerName={purchaseFarmer.farmerName}
          farmerPhoto={purchaseFarmer.profilePicture}
          farmerVerificationStatus={purchaseFarmer.verificationStatus}
          farmerVerificationTags={purchaseFarmer.verificationTags}
          country={purchaseFarmer.country}
          region={purchaseFarmer.region}
          onSelectProduct={(p) => setActiveListingId(p.id)}
          onClose={closePurchase}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
}
