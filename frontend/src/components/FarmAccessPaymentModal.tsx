"use client";

import { useState } from "react";
import { FarmerBrowseCard } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { PaymentCheckout, TransactionSuccess } from "@/components/PaymentCheckout";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";

interface FarmAccessPaymentModalProps {
  farmer: FarmerBrowseCard;
  onClose: () => void;
  onSuccess: () => void;
}

export function FarmAccessPaymentModal({
  farmer,
  onClose,
  onSuccess,
}: FarmAccessPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  const fee = farmer.farmAccessFee ?? 0;
  const feeLabel = farmer.farmAccessPriceLabel ?? `GHC ${fee}`;

  const handlePay = async (paymentMethod: string) => {
    setSubmitting(true);
    setError("");
    try {
      await api.payments.purchaseFarmAccess(farmer.farmerId, paymentMethod);
      setPaid(true);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-brand-100 bg-brand-50/60 p-5">
          <div className="flex items-center gap-3">
            <FarmerAvatar src={farmer.profilePicture} name={farmer.farmerName} size="md" />
            <div>
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
          {paid ? (
            <TransactionSuccess
              title="Payment received"
              message={`${feeLabel} paid for access to ${farmer.farmName}.`}
              hint="Admin will review your request. You can view products once approved."
              onDismiss={onClose}
            />
          ) : (
            <>
              <p className="text-sm text-gray-600">
                One-time fee to view products, prices, and purchase from this farm.
              </p>

              <PaymentCheckout
                totalLabel="Farm access"
                totalAmount={feeLabel}
                payLabel={`Pay ${feeLabel}`}
                onPay={handlePay}
                submitting={submitting}
                error={error}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
