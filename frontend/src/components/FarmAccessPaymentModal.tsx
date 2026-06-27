"use client";

import { useState } from "react";
import { FarmerBrowseCard } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { api } from "@/lib/api";

interface FarmAccessPaymentModalProps {
  farmer: FarmerBrowseCard;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { id: "mobile_money", label: "Mobile Money (MTN / Vodafone)" },
  { id: "bank_transfer", label: "Bank Transfer" },
];

export function FarmAccessPaymentModal({
  farmer,
  onClose,
  onSuccess,
}: FarmAccessPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fee = farmer.farmAccessFee ?? 0;
  const feeLabel = farmer.farmAccessPriceLabel ?? `GHC ${fee}`;

  const handlePay = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.payments.purchaseFarmAccess(farmer.farmerId, paymentMethod);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-brand-100 bg-brand-50/60 p-6">
          <div className="flex items-center gap-4">
            <FarmerAvatar src={farmer.profilePicture} name={farmer.farmerName} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-brand-900">{farmer.farmerName}</h2>
              <p className="text-sm text-brand-700">{farmer.farmName}</p>
              <CountryBadge country={farmer.country} region={farmer.region} />
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600">
            Pay once to access this farmer&apos;s farm — view product images, prices, quantities, and
            purchase directly.
          </p>

          {farmer.farmSize && (
            <p className="mt-3 text-sm text-brand-800">
              Farm size: <strong>{farmer.farmSize}</strong>
            </p>
          )}

          {farmer.registeredCommodities.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Commodities</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {farmer.registeredCommodities.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl bg-brand-900 p-4 text-white">
            <p className="text-xs uppercase tracking-wide text-brand-300">Farm access fee</p>
            <p className="text-3xl font-bold">{feeLabel}</p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-brand-900">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-2 w-full rounded-xl border border-brand-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-outline py-2.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={submitting}
              className="flex-1 btn-primary py-2.5 disabled:opacity-60"
            >
              {submitting ? "Processing..." : `Pay ${feeLabel}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
