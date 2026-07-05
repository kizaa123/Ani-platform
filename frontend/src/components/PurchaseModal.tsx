"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Listing, formatListingUnit } from "@/lib/types";
import { FarmerAvatar, ProductImage } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { FarmerProductCard } from "@/components/FarmerProductCard";
import { Icon } from "@/components/icons";

interface PurchaseViewProps {
  listing: Listing;
  relatedProducts: Listing[];
  farmerName: string;
  farmerPhoto?: string | null;
  country?: string;
  region?: string;
  onSelectProduct: (product: Listing) => void;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  {
    id: "mobile_money",
    label: "Mobile Money",
    sublabel: "Pay with MTN Mobile Money or Telecel Cash",
    icon: "coins" as const,
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    sublabel: "Transfer directly to farm bank account",
    icon: "credit-card" as const,
  },
];

export function PurchaseModal({
  listing,
  relatedProducts,
  farmerName,
  farmerPhoto,
  country,
  region,
  onSelectProduct,
  onClose,
  onSuccess,
}: PurchaseViewProps) {
  const maxQty = listing.quantity ?? 0;
  const unitPrice = listing.price ?? 0;
  const unit = listing.unit ?? "bags";
  const unitLabel = formatListingUnit(unit);

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const total = Math.round(quantity * unitPrice * 100) / 100;
  const canPurchase = listing.available !== false && maxQty > 0;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setQuantity(Math.min(1, maxQty) || 1);
    setError("");
    setSuccessMsg("");
    setActiveImageIndex(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [listing.id]);

  useEffect(() => {
    setQuantity((prev) => {
      if (maxQty <= 0) return prev;
      return Math.min(Math.max(1, prev), maxQty);
    });
  }, [maxQty]);

  const handlePurchase = async () => {
    if (!canPurchase) return;
    if (quantity <= 0 || quantity > maxQty) {
      setError(`Enter a quantity between 1 and ${maxQty}`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.marketplace.purchase(listing.id, { quantity, paymentMethod });
      setSuccessMsg(
        `${quantity} ${unitLabel} — GHC ${total.toFixed(2)} paid to ${farmerName}.`
      );
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  };

  const orderPlaced = Boolean(successMsg);

  const currentImage = listing.images?.[activeImageIndex] || listing.images?.[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <header className="shrink-0 border-b border-brand-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50"
          >
            ← Back to Marketplace
          </button>
          <div className="flex items-center gap-3">
            <FarmerAvatar src={farmerPhoto} name={farmerName} size="md" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-brand-900">{farmerName}</p>
              <CountryBadge country={country} region={region} />
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {orderPlaced && (
            <div
              role="status"
              className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  <Icon name="check" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-900">Order placed successfully</p>
                  <p className="mt-1 text-sm text-green-800">{successMsg}</p>
                  <p className="mt-1 text-sm text-green-700">
                    You can track this order from My Orders.
                  </p>
                  <Link
                    href="/orders"
                    className="mt-4 inline-block rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                  >
                    View my orders
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Purchase section — top */}
          <section className="mb-10">
            <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-brand-600">
              Purchase product
            </p>

            <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 lg:items-start">
              {/* Image gallery layout */}
              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 shadow-md">
                  {currentImage ? (
                    <ProductImage
                      src={currentImage}
                      alt={listing.title}
                      className="aspect-[16/10] w-full object-cover lg:aspect-square lg:min-h-[28rem]"
                    />
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 lg:aspect-square lg:min-h-[28rem]">
                      <Icon name="wheat" className="h-20 w-20 text-brand-400" />
                    </div>
                  )}
                </div>
                {listing.images && listing.images.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {listing.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImageIndex(i)}
                        className={`relative h-20 w-20 overflow-hidden rounded-xl border bg-brand-50 transition-all ${
                          activeImageIndex === i
                            ? "border-brand-600 ring-2 ring-brand-500 ring-offset-2"
                            : "border-brand-100 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <ProductImage
                          src={img}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase form */}
              <div className="flex flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{listing.title}</h1>
                    <p className="mt-1 text-brand-600">{listing.commodity?.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                      listing.available
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {listing.available ? "Available" : "Unavailable"}
                  </span>
                </div>

                {listing.description && (
                  <p className="mt-4 text-gray-600 leading-relaxed">{listing.description}</p>
                )}

                {listing.harvestLabel && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Harvest calendar
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-amber-950">
                      <Icon name="calendar" className="h-4 w-4 shrink-0" />
                      {listing.harvestLabel}
                    </p>
                  </div>
                )}

                <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                  <p className="text-2xl font-bold text-brand-900">
                    {listing.priceLabel || `GHC ${unitPrice}/${unitLabel}`}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    In stock:{" "}
                    <strong>
                      {listing.quantityLabel ||
                        `${maxQty} ${unitLabel}`}
                    </strong>
                  </p>
                </div>

                {!orderPlaced && !canPurchase ? (
                  <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    This product is currently unavailable. Choose another item from this farm below.
                  </p>
                ) : !orderPlaced ? (
                  <div className="mt-6 space-y-6">
                    {/* Quantity selectors */}
                    <div>
                      <label className="block text-sm font-semibold text-brand-900">
                        Quantity ({unitLabel})
                      </label>
                      <div className="mt-2.5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                          disabled={quantity <= 1}
                          className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-200 text-xl font-semibold text-brand-900 hover:bg-brand-50 active:bg-brand-100 disabled:opacity-40 transition-colors"
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
                          className="h-12 w-28 rounded-xl border border-brand-200 text-center text-lg font-bold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(prev => Math.min(maxQty, prev + 1))}
                          disabled={quantity >= maxQty}
                          className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-200 text-xl font-semibold text-brand-900 hover:bg-brand-50 active:bg-brand-100 disabled:opacity-40 transition-colors"
                        >
                          +
                        </button>
                        <span className="text-sm text-gray-500">
                          (Max: {maxQty} {unitLabel})
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        GHC {unitPrice} per {unitLabel} — total updates automatically
                      </p>
                    </div>

                    {/* Payment methods */}
                    <div>
                      <label htmlFor="payment-method" className="block text-sm font-semibold text-brand-900">
                        Payment Method
                      </label>
                      <select
                        id="payment-method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} ({m.id === "mobile_money" ? "MTN / Telecel" : "Direct Transfer"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl bg-brand-900 p-5 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-brand-200">
                          {quantity} × GHC {unitPrice}
                        </span>
                        <span className="text-2xl font-bold">GHC {total.toFixed(2)}</span>
                      </div>
                      <p className="mt-2 text-xs text-brand-300">
                        Payment goes directly to {farmerName}&apos;s farm account
                      </p>
                    </div>

                    {error && (
                      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
                    )}

                    <button
                      type="button"
                      onClick={handlePurchase}
                      disabled={submitting}
                      className="btn-primary w-full py-4 text-base disabled:opacity-60"
                    >
                      {submitting ? "Processing payment..." : `Pay GHC ${total.toFixed(2)}`}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* Related farm products — bottom */}
          {relatedProducts.length > 0 && (
            <section className="border-t border-brand-100 pt-10">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-brand-900">More from this farm</h2>
                <p className="text-sm text-gray-500">
                  Select another product to purchase from {farmerName}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {relatedProducts.map((product) => (
                  <FarmerProductCard
                    key={product.id}
                    product={product}
                    active={product.id === listing.id}
                    onClick={() => onSelectProduct(product)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
