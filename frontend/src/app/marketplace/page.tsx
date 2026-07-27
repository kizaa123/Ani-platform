"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  FarmerBrowseCard,
  Listing,
  MarketplaceBrowse,
  isMarketplaceBuyer,
  isFarmer,
} from "@/lib/types";
import { FarmerProductCard } from "@/components/FarmerProductCard";
import { MarketplaceFarmerSection } from "@/components/MarketplaceFarmerSection";
import { PurchaseModal } from "@/components/PurchaseModal";
import { Icon } from "@/components/icons";
import { CardGridSkeleton, PageContentSkeleton } from "@/components/LoadingPrimitives";

function filterFarmers(farmers: FarmerBrowseCard[], query: string): FarmerBrowseCard[] {
  const term = query.trim().toLowerCase();
  if (!term) return farmers;
  return farmers.filter((f) => (f.searchTerms ?? "").toLowerCase().includes(term));
}

function AccessMoreFarmsCTA() {
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/80 via-white to-brand-50/40 p-6 text-center sm:p-8">
      <p className="mb-4 text-sm text-gray-600">
        Discover registered farmers and pay for one-time access to browse their products.
      </p>
      <Link
        href="/access"
        className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-2.5"
      >
        <Icon name="lock" className="h-4 w-4 shrink-0" />
        Access more farms
      </Link>
    </div>
  );
}

function filterListings(listings: Listing[], query: string): Listing[] {
  const term = query.trim().toLowerCase();
  if (!term) return listings;
  return listings.filter((l) => {
    const haystack = [
      l.title,
      l.description,
      l.commodity?.name,
      l.commodity?.category?.name,
      l.location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

export default function MarketplacePage() {
  const { user, loading } = useAuth();
  const [browse, setBrowse] = useState<MarketplaceBrowse | null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [purchaseFarmer, setPurchaseFarmer] = useState<FarmerBrowseCard | null>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [orderPlacedMessage, setOrderPlacedMessage] = useState("");
  const router = useRouter();

  const farmerView = user ? isFarmer(user.roleId) : false;
  const [browseLoading, setBrowseLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);

  const loadBrowse = useCallback(() => {
    if (farmerView) {
      api.marketplace
        .my()
        .then(setMyListings)
        .catch(console.error)
        .finally(() => setListingsLoading(false));
      return;
    }
    api.marketplace
      .browse()
      .then(setBrowse)
      .catch(console.error)
      .finally(() => setBrowseLoading(false));
  }, [farmerView]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) loadBrowse();
  }, [user?.id, loading, router, loadBrowse]);

  const accessibleFarmers = useMemo(
    () =>
      filterFarmers(
        (browse?.farmers ?? []).filter((f) => f.canViewProducts),
        search
      ),
    [browse?.farmers, search]
  );

  const showAccessCta = !!user && isMarketplaceBuyer(user.roleId);

  const filteredMyListings = useMemo(
    () => filterListings(myListings, search),
    [myListings, search]
  );

  const openPurchase = (farmer: FarmerBrowseCard, product: Listing) => {
    setPurchaseFarmer(farmer);
    setActiveListingId(product.id);
  };

  const closePurchase = () => {
    setPurchaseFarmer(null);
    setActiveListingId(null);
  };

  const handleOrderSuccess = useCallback(() => {
    setBrowseLoading(true);
    loadBrowse();
    setOrderPlacedMessage("Order placed successfully!");
  }, [loadBrowse]);

  useEffect(() => {
    if (!orderPlacedMessage) return;
    const timer = window.setTimeout(() => setOrderPlacedMessage(""), 8000);
    return () => window.clearTimeout(timer);
  }, [orderPlacedMessage]);

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

  if (farmerView) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-900">Marketplace</h1>
            <p className="text-gray-500">
              Your product listings as buyers see them after access is granted
            </p>
          </div>
          <Link
            href="/farm"
            className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Manage on My Farm
          </Link>
        </div>

        <div className="mb-8">
          <label htmlFor="marketplace-search" className="sr-only">
            Search your products
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
              placeholder="Search your products by title or commodity..."
              className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 text-brand-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          {search.trim() && (
            <p className="mt-2 text-sm text-gray-500">
              {filteredMyListings.length} product{filteredMyListings.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>

        {listingsLoading ? (
          <CardGridSkeleton />
        ) : filteredMyListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-200 p-12 text-center text-gray-500">
            {search.trim() ? (
              "No products match your search."
            ) : (
              <>
                No products listed yet.{" "}
                <Link href="/farm" className="font-semibold text-brand-700 hover:underline">
                  Add your first product
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMyListings.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm"
              >
                <FarmerProductCard
                  product={product}
                  onClick={() => router.push("/farm")}
                />
                <div className="border-t border-brand-50 px-4 py-2 text-xs text-gray-500 capitalize">
                  Status: {product.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-900">Marketplace</h1>
          <p className="text-gray-500">
            Purchase from farms you have paid access to
          </p>
        </div>
      </div>

      <div className="mb-8">
        <label htmlFor="marketplace-search" className="sr-only">
          Search farmers, commodities, or products
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
            placeholder="Search by farmer name, commodity, or product..."
            className="w-full rounded-2xl border border-brand-200 bg-white py-3.5 pl-12 pr-4 text-brand-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        {search.trim() && (
          <p className="mt-2 text-sm text-gray-500">
            {accessibleFarmers.length} farmer{accessibleFarmers.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {orderPlacedMessage && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
        >
          <Icon name="check" className="h-5 w-5 shrink-0 text-green-600" />
          {orderPlacedMessage}
        </div>
      )}

      {browseLoading ? (
        <CardGridSkeleton />
      ) : accessibleFarmers.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-brand-200 p-12 text-center text-gray-500">
            {search.trim()
              ? "No accessible farms match your search."
              : showAccessCta
                ? "You don't have access to any farms yet."
                : "No farmers registered yet."}
          </div>
          {showAccessCta && <AccessMoreFarmsCTA />}
        </div>
      ) : (
        <div className="space-y-6 md:space-y-7">
          {accessibleFarmers.map((farmer) => (
            <MarketplaceFarmerSection
              key={farmer.farmerId}
              farmer={farmer}
              onProductClick={(product) => openPurchase(farmer, product)}
            />
          ))}
          {showAccessCta && <AccessMoreFarmsCTA />}
        </div>
      )}

      {purchaseFarmer && activeListing && (
        <PurchaseModal
          listing={activeListing}
          relatedProducts={purchaseFarmer.products}
          farmerId={purchaseFarmer.farmerId}
          farmerName={purchaseFarmer.farmerName}
          farmerPhoto={purchaseFarmer.profilePicture}
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
