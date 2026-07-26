"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Listing, formatListingUnit } from "@/lib/types";
import { FarmerAvatar, ProductImage } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { FarmerProductCard } from "@/components/FarmerProductCard";
import { PaymentCheckout, TransactionSuccess } from "@/components/PaymentCheckout";
import { Icon } from "@/components/icons";

interface PurchaseViewProps {
  listing: Listing;
  relatedProducts: Listing[];
  farmerId: string;
  farmerName: string;
  farmerPhoto?: string | null;
  country?: string;
  region?: string;
  onSelectProduct: (product: Listing) => void;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseModal({
  listing,
  relatedProducts,
  farmerId: _farmerId,
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [releaseOtp, setReleaseOtp] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const total = Math.round(quantity * unitPrice * 100) / 100;
  const canPurchase = listing.available !== false && maxQty > 0;
  const orderPlaced = Boolean(successMsg);

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
    setReleaseOtp(null);
    setActiveImageIndex(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [listing.id]);

  useEffect(() => {
    setQuantity((prev) => {
      if (maxQty <= 0) return prev;
      return Math.min(Math.max(1, prev), maxQty);
    });
  }, [maxQty]);

  const handlePurchase = async (paymentMethod: string) => {
    if (!canPurchase) return;
    if (quantity <= 0 || quantity > maxQty) {
      setError(`Enter a quantity between 1 and ${maxQty}`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await api.marketplace.purchase(listing.id, { quantity, paymentMethod });
      setReleaseOtp(result.releaseOtp);
      setSuccessMsg(
        `${quantity} ${unitLabel} — GHC ${total.toFixed(2)} held in escrow until you confirm delivery.`
      );
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  };

  const currentImage = listing.images?.[activeImageIndex] || listing.images?.[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
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
            <FarmerAvatar src={farmerPhoto} name={farmerName} size="sm" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-brand-900">{farmerName}</p>
              <CountryBadge country={country} region={region} />
            </div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-6 sm:max-w-6xl sm:py-8">
          {orderPlaced && (
            <div className="mb-6">
              <TransactionSuccess
                title="Order placed successfully"
                message={successMsg}
                hint={
                  releaseOtp
                    ? `Your 4-digit release code is ${releaseOtp}. Save it — you'll enter it in My Orders when you receive your delivery.`
                    : "Check My Orders for your release code and financial statement PDF."
                }
                actionLabel="View my orders"
                onAction={() => {
                  window.location.href = "/orders";
                }}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 lg:items-start">
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-50">
                {currentImage ? (
                  <ProductImage
                    src={currentImage}
                    alt={listing.title}
                    className="aspect-[4/3] w-full object-cover sm:aspect-square"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 sm:aspect-square">
                    <Icon name="wheat" className="h-16 w-16 text-brand-400" />
                  </div>
                )}
              </div>
              {listing.images && listing.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImageIndex(i)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-all ${
                        activeImageIndex === i
                          ? "border-brand-600 ring-2 ring-brand-500"
                          : "border-brand-100 opacity-70"
                      }`}
                    >
                      <ProductImage src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-brand-900 sm:text-2xl">{listing.title}</h1>
                  <p className="mt-0.5 text-sm text-brand-600">{listing.commodity?.name}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    listing.available ? "bg-green-500 text-white" : "bg-red-500 text-white"
                  }`}
                >
                  {listing.available ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                <p className="text-xl font-bold text-brand-900">
                  {listing.priceLabel || `GHC ${unitPrice}/${unitLabel}`}
                </p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {listing.quantityLabel || `${maxQty} ${unitLabel} in stock`}
                </p>
              </div>

              {!orderPlaced && !canPurchase ? (
                <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  This product is unavailable. Try another item below.
                </p>
              ) : !orderPlaced ? (
                <div className="mt-5 space-y-5">
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
                    totalLabel={`${quantity} × GHC ${unitPrice}`}
                    totalAmount={`GHC ${total.toFixed(2)}`}
                    subtitle="Payment held in escrow until you confirm delivery"
                    payLabel={`Pay GHC ${total.toFixed(2)}`}
                    onPay={handlePurchase}
                    submitting={submitting}
                    error={error}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <section className="mt-10 border-t border-brand-100 pt-8">
              <h2 className="text-lg font-bold text-brand-900">More from this farm</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
