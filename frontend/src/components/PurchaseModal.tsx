"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useMoneyFormat } from "@/hooks/useMoneyFormat";
import { Listing, formatListingUnit, listingCommodityName, ROLES } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { RolePrefixedName, splitDisplayName } from "@/components/RolePrefixedName";
import { FarmerProductCard } from "@/components/FarmerProductCard";
import { ProductMediaGallery } from "@/components/ProductMediaGallery";
import { PaymentCheckout } from "@/components/PaymentCheckout";
import { PaymentResultOverlay } from "@/components/PaymentResultOverlay";
import { HarvestCalendarTrigger } from "@/components/HarvestCalendarTrigger";
import { Icon } from "@/components/icons";
import type { UserVerificationTag } from "@/lib/types";

const EMPTY_MEDIA: never[] = [];

interface PurchaseViewProps {
  listing: Listing | null;
  relatedProducts: Listing[];
  farmerId: string;
  farmerName: string;
  farmerPhoto?: string | null;
  farmerVerificationStatus?: string | null;
  farmerVerificationTags?: UserVerificationTag[];
  country?: string;
  region?: string;
  farmName?: string | null;
  onSelectProduct: (product: Listing) => void;
  onClose: () => void;
  onSuccess: () => void;
}

function FarmViewHeader({
  farmerName,
  farmerPhoto,
  farmerVerificationStatus,
  farmerVerificationTags,
  country,
  region,
  onClose,
}: Pick<
  PurchaseViewProps,
  | "farmerName"
  | "farmerPhoto"
  | "farmerVerificationStatus"
  | "farmerVerificationTags"
  | "country"
  | "region"
  | "onClose"
>) {
  const { firstName, lastName } = splitDisplayName(farmerName);

  return (
    <header className="shrink-0 border-b border-brand-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <AvatarWithVerification
            src={farmerPhoto}
            name={farmerName}
            size="sm"
            verificationStatus={farmerVerificationStatus}
            verificationTags={farmerVerificationTags}
            tagPlacement="none"
          />
          <div className="hidden text-right sm:block">
            <RolePrefixedName
              user={{
                roleId: ROLES.CROP_FARMER,
                firstName,
                lastName,
                verificationStatus: farmerVerificationStatus,
              }}
              verificationTags={farmerVerificationTags}
              nameClassName="text-sm font-semibold text-brand-900"
              prefixClassName="text-sm font-semibold text-brand-900"
            />
            <CountryBadge country={country} region={region} />
          </div>
        </div>
      </div>
    </header>
  );
}

export function PurchaseModal({
  listing,
  relatedProducts,
  farmerId: _farmerId,
  farmerName,
  farmerPhoto,
  farmerVerificationStatus,
  farmerVerificationTags,
  country,
  region,
  farmName,
  onSelectProduct,
  onClose,
  onSuccess,
}: PurchaseViewProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!listing && relatedProducts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <FarmViewHeader
          farmerName={farmerName}
          farmerPhoto={farmerPhoto}
          farmerVerificationStatus={farmerVerificationStatus}
          farmerVerificationTags={farmerVerificationTags}
          country={country}
          region={region}
          onClose={onClose}
        />
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="package" className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-brand-900 sm:text-2xl">No product listed</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
            {farmName || farmerName} has not listed any products for order right now. Check back
            when a new listing is posted.
          </p>
        </div>
      </div>
    );
  }

  const resolvedListing = listing ?? relatedProducts[0];
  if (!resolvedListing) return null;

  return (
    <PurchaseModalContent
      listing={resolvedListing}
      relatedProducts={relatedProducts}
      farmerName={farmerName}
      farmerPhoto={farmerPhoto}
      farmerVerificationStatus={farmerVerificationStatus}
      farmerVerificationTags={farmerVerificationTags}
      country={country}
      region={region}
      onSelectProduct={onSelectProduct}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function PurchaseModalContent({
  listing,
  relatedProducts,
  farmerName,
  farmerPhoto,
  farmerVerificationStatus,
  farmerVerificationTags,
  country,
  region,
  onSelectProduct,
  onClose,
  onSuccess,
}: Omit<PurchaseViewProps, "listing" | "farmName" | "farmerId"> & { listing: Listing }) {
  const { format, formatUnitPrice } = useMoneyFormat();
  const maxQty = listing.quantity ?? 0;
  const unitPrice = listing.price ?? 0;
  const unit = listing.unit ?? "bags";
  const unitLabel = formatListingUnit(unit);

  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [result, setResult] = useState<
    | { variant: "success"; message: string; releaseOtp: string | null }
    | { variant: "error"; message: string }
    | null
  >(null);
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const canPurchase = listing.available !== false && maxQty > 0;
  const otherFarmProducts = relatedProducts.filter((product) => product.id !== listing.id);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrderPlaced(false);
    setResult(null);
    setQuantity(Math.min(1, maxQty) || 1);
  }, [listing.id, maxQty]);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [listing.id]);

  const handleSelectProduct = (product: Listing) => {
    onSelectProduct(product);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    setQuantity((prev) => {
      if (maxQty <= 0) return prev;
      return Math.min(Math.max(1, prev), maxQty);
    });
  }, [maxQty]);

  const handlePurchase = async (paymentMethod: string) => {
    if (!canPurchase) return;
    if (quantity <= 0 || quantity > maxQty) {
      setResult({
        variant: "error",
        message: `Enter a quantity between 1 and ${maxQty}`,
      });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const purchaseResult = await api.marketplace.purchase(listing.id, { quantity, paymentMethod });
      const message = `${quantity} ${unitLabel} - ${format(total)} held in escrow until you confirm delivery.`;
      setOrderPlaced(true);
      setResult({ variant: "success", message, releaseOtp: purchaseResult.releaseOtp });
    } catch (e) {
      setResult({
        variant: "error",
        message: e instanceof Error ? e.message : "Purchase failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <FarmViewHeader
        farmerName={farmerName}
        farmerPhoto={farmerPhoto}
        farmerVerificationStatus={farmerVerificationStatus}
        farmerVerificationTags={farmerVerificationTags}
        country={country}
        region={region}
        onClose={onClose}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-6 sm:max-w-6xl sm:py-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 lg:items-start">
            <div className="flex flex-col gap-3">
              <ProductMediaGallery
                listingId={listing.id}
                productTitle={listing.title}
                media={listing.media ?? EMPTY_MEDIA}
                fallbackImages={listing.images}
                interactive
              />
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-brand-900 sm:text-2xl">{listing.title}</h1>
                    {listingCommodityName(listing) && (
                      <p className="mt-1 text-sm text-brand-600">{listingCommodityName(listing)}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      listing.available ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    {listing.available ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-4">
                <p className="text-sm text-brand-900">
                  <span className="font-semibold">Price:</span> {formatUnitPrice(unitPrice, unit)}
                </p>
                <p className="text-sm text-brand-900">
                  <span className="font-semibold">Quantity:</span> {maxQty}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-900">Delivery:</span>
                  <HarvestCalendarTrigger
                    harvestStartDate={listing.harvestStartDate}
                    harvestEndDate={listing.harvestEndDate}
                    harvestLabel={listing.harvestLabel}
                    commodityName={listingCommodityName(listing) || undefined}
                    productTitle={listing.title}
                    showLabel={false}
                    alwaysShow
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
                    iconClassName="h-4 w-4"
                  />
                </div>
              </div>

              {listing.description?.trim() && (
                <div className="space-y-1.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                    Description
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                    {listing.description.trim()}
                  </p>
                </div>
              )}

              {!orderPlaced && !canPurchase ? (
                <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  This product is unavailable. Try another item below.
                </p>
              ) : !orderPlaced ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-brand-900">Quantity</label>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        disabled={quantity <= 1}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-200 text-lg font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={maxQty}
                        step={1}
                        value={quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(maxQty, Number(e.target.value)));
                          setQuantity(val || 1);
                        }}
                        className="h-11 w-20 rounded-xl border border-brand-200 text-center text-lg font-bold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label={`Quantity in ${unitLabel}`}
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.min(maxQty, prev + 1))}
                        disabled={quantity >= maxQty}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-200 text-lg font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-500">{unitLabel}</span>
                    </div>
                  </div>

                  <PaymentCheckout
                    totalLabel={`${quantity} × ${format(unitPrice)}`}
                    totalAmount={format(total)}
                    payLabel={`Pay ${format(total)}`}
                    onPay={handlePurchase}
                    submitting={submitting}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {otherFarmProducts.length > 0 && (
            <section className="mt-8 border-t border-brand-100 pt-6">
              <h2 className="text-base font-bold text-brand-900">More from this farm</h2>
              <div className="mt-4 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherFarmProducts.map((product) => (
                  <FarmerProductCard
                    key={product.id}
                    product={product}
                    compact
                    onClick={() => handleSelectProduct(product)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {result?.variant === "success" && (
        <PaymentResultOverlay
          variant="success"
          title="Order placed successfully"
          message={result.message}
          hint={
            result.releaseOtp
              ? `Your 4-digit release code is ${result.releaseOtp}. Save it - you'll enter it in My Orders when you receive your delivery.`
              : "Check My Orders for your release code and financial statement PDF."
          }
          actionLabel="View my orders"
          onAction={() => {
            onSuccess();
            window.location.href = "/orders";
          }}
          onDismiss={() => {
            onSuccess();
            onClose();
          }}
          dismissLabel="Continue shopping"
        />
      )}

      {result?.variant === "error" && (
        <PaymentResultOverlay
          variant="error"
          message={result.message}
          onAction={() => setResult(null)}
          onDismiss={onClose}
          dismissLabel="Close"
        />
      )}
    </div>
  );
}
