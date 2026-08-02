"use client";

import { useState } from "react";
import { FarmerBrowseCard } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { PaymentCheckout } from "@/components/PaymentCheckout";
import { PaymentResultOverlay } from "@/components/PaymentResultOverlay";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";
import { FARM_ACCESS_PRICE_GHC } from "@/lib/pricing";
import { formatGhc } from "@/lib/format";

interface FarmAccessPaymentModalProps {
  farmer: FarmerBrowseCard;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentResult =
  | { variant: "success" }
  | { variant: "error"; message: string };

export function FarmAccessPaymentModal({
  farmer,
  onClose,
  onSuccess,
}: FarmAccessPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);

  const fee = farmer.farmAccessFee ?? FARM_ACCESS_PRICE_GHC;
  const feeLabel = farmer.farmAccessPriceLabel ?? formatGhc(fee);

  const handlePay = async (paymentMethod: string) => {
    setSubmitting(true);
    setResult(null);
    try {
      await api.payments.purchaseFarmAccess(farmer.farmerId, paymentMethod);
      setResult({ variant: "success" });
      onSuccess();
    } catch (e) {
      setResult({
        variant: "error",
        message: e instanceof Error ? e.message : "Payment failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isSuccess = result?.variant === "success";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess ? (
          <div className="flex flex-col">
            <div className="flex justify-end border-b border-brand-100 bg-brand-50/40 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-brand-700"
                aria-label="Close"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center px-6 py-8 text-center sm:px-8 sm:py-10">
              <PaymentResultOverlay
                variant="success"
                embedded
                title="Access granted"
                message={`Your ${feeLabel} payment was successful. Instant access to ${farmer.farmName} is now active.`}
                hint="Browse products and place orders from this farm."
                actionLabel="Browse farm"
                onDismiss={onClose}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-brand-100 bg-brand-50/60 p-5">
              <div className="flex items-center gap-3">
                <AvatarWithVerification
                  src={farmer.profilePicture}
                  name={farmer.farmerName}
                  size="md"
                  verificationStatus={farmer.verificationStatus}
                  verificationTags={farmer.verificationTags}
                />
                <div className="min-w-0 text-left">
                  <h2 className="text-lg font-bold text-brand-900">{farmer.farmerName}</h2>
                  <p className="text-sm text-brand-700">{farmer.farmName}</p>
                  <CountryBadge country={farmer.country} region={farmer.region} />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-brand-700"
                aria-label="Close"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {farmer.farmAccessExpired ? (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Your previous access has expired because the harvest period ended or this fellow
                  listed a new product. Pay again to view products and place orders.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  One-time fee to view products, prices, and purchase from this farm for the current
                  harvest period.
                </p>
              )}

              <PaymentCheckout
                totalLabel="Farm access"
                totalAmount={feeLabel}
                payLabel={`Pay ${feeLabel}`}
                onPay={handlePay}
                submitting={submitting}
              />
            </div>

            {result?.variant === "error" && (
              <PaymentResultOverlay
                variant="error"
                compact
                message={result.message}
                onAction={() => setResult(null)}
                onDismiss={onClose}
                dismissLabel="Close"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
