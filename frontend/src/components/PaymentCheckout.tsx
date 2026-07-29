"use client";

import { useState } from "react";

export const PAYMENT_METHODS = [
  { id: "mobile_money", label: "Mobile Money", shortLabel: "MTN / Telecel" },
  { id: "bank_transfer", label: "Bank Transfer", shortLabel: "Direct transfer" },
] as const;

interface PaymentCheckoutProps {
  totalLabel: string;
  totalAmount: string;
  subtitle?: string;
  payLabel: string;
  onPay: (paymentMethod: string) => void | Promise<void>;
  submitting?: boolean;
  error?: string;
  disabled?: boolean;
}

export function PaymentCheckout({
  totalLabel,
  totalAmount,
  subtitle,
  payLabel,
  onPay,
  submitting = false,
  error,
  disabled = false,
}: PaymentCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [showMethods, setShowMethods] = useState(false);

  const selected =
    PAYMENT_METHODS.find((m) => m.id === paymentMethod) ?? PAYMENT_METHODS[0];

  return (
    <div className="space-y-4">

      <div className="rounded-xl border border-brand-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            Pay via{" "}
            <span className="font-semibold text-brand-900">{selected.label}</span>
          </p>
          <button
            type="button"
            onClick={() => setShowMethods((open) => !open)}
            className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-800"
          >
            {showMethods ? "Done" : "Change"}
          </button>
        </div>
        {showMethods && (
          <div className="mt-3 space-y-1 border-t border-brand-50 pt-3">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand-50"
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={m.id}
                  checked={paymentMethod === m.id}
                  onChange={() => setPaymentMethod(m.id)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-medium text-brand-900">{m.label}</span>
                  <span className="text-xs text-gray-500">{m.shortLabel}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => onPay(paymentMethod)}
        disabled={submitting || disabled}
        className="btn-primary w-full py-4 text-base disabled:opacity-60"
      >
        {submitting ? "Processing..." : payLabel}
      </button>
    </div>
  );
}

export type { PaymentResultOverlayProps as TransactionSuccessProps } from "@/components/PaymentResultOverlay";
export { PaymentResultOverlay as TransactionSuccess } from "@/components/PaymentResultOverlay";
