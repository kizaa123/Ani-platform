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
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { FarmerProductCard } from "@/components/FarmerProductCard";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PurchaseModal } from "@/components/PurchaseModal";
import { Icon } from "@/components/icons";

function filterFarmers(farmers: FarmerBrowseCard[], query: string): FarmerBrowseCard[] {
  const term = query.trim().toLowerCase();
  if (!term) return farmers;
  return farmers.filter((f) => (f.searchTerms ?? "").includes(term));
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

  const loadBrowse = useCallback(() => {
    if (farmerView) {
      api.marketplace.my().then(setMyListings).catch(console.error);
      return;
    }
    api.marketplace.browse().then(setBrowse).catch(console.error);
  }, [farmerView]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) loadBrowse();
  }, [user?.id, loading, router, loadBrowse]);

  const filteredFarmers = useMemo(
    () => filterFarmers(browse?.farmers ?? [], search),
    [browse?.farmers, search]
  );

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

  if (loading) return <div className="p-12 text-center">Loading...</div>;

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

        {filteredMyListings.length === 0 ? (
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
            Browse registered farmers and purchase from farms you have access to
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
            {filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? "s" : ""} found
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

      {filteredFarmers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 p-12 text-center text-gray-500">
          {search.trim() ? "No farmers match your search." : "No farmers registered yet."}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredFarmers.map((farmer) => (
            <section
              key={farmer.farmerId}
              className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm"
            >
              <div className="border-b border-brand-50 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-row items-center gap-3 sm:items-start sm:gap-4">
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <FarmerAvatar
                      src={farmer.profilePicture}
                      name={farmer.farmerName}
                      size="md"
                    />
                    <VerificationBadge
                      status={farmer.verificationStatus}
                      className="text-[10px] px-2 py-0.5"
                    />
                  </div>
                  <h3 className="min-w-0 flex-1 text-left font-bold text-brand-900 sm:pt-3">
                    {farmer.farmerName}
                  </h3>
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
                        <div
                          key={product.id}
                          className="w-72 shrink-0 snap-start sm:w-80"
                        >
                          <FarmerProductCard
                            product={product}
                            onClick={() => openPurchase(farmer, product)}
                            imageClassName="h-44 w-full object-cover sm:h-52 md:h-56"
                            contentClassName="p-4"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No products listed yet from this farm.
                  </div>
                )
              ) : user && isMarketplaceBuyer(user.roleId) ? (
                <div className="border-t border-brand-50 px-4 py-4 sm:px-5">
                  {farmer.hasFarmAccess && farmer.connectionStatus === "PENDING" ? (
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-amber-900">
                        Payment received — waiting for ANI admin approval
                      </p>
                      <Link
                        href="/connections"
                        className="btn-outline mt-3 inline-block w-full max-w-xs py-2.5"
                      >
                        View connection status
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-brand-50 px-4 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Farm access required
                        </p>
                        <p className="mt-0.5 text-lg font-bold text-brand-900">
                          {farmer.farmAccessPriceLabel ?? browse?.farmAccessPriceLabel ?? "—"}
                        </p>
                      </div>
                      <Link href="/access" className="btn-gold shrink-0 px-6 py-2.5">
                        Pay to Access Farm
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          ))}
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
