"use client";

import { useState } from "react";
import { ResearchPublication, canPurchasePublication, isResearcher } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { PaymentCheckout, TransactionSuccess } from "@/components/PaymentCheckout";
import { Icon } from "@/components/icons";
import { formatGhc } from "@/lib/format";
import { api } from "@/lib/api";

interface PublicationAccessPaymentModalProps {
  publication: ResearchPublication;
  userRoleId: number;
  onClose: () => void;
  onSuccess: (publication: ResearchPublication) => void;
  onReadNow: (publication: ResearchPublication) => void;
}

export function PublicationAccessPaymentModal({
  publication,
  userRoleId,
  onClose,
  onSuccess,
  onReadNow,
}: PublicationAccessPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [unlocked, setUnlocked] = useState<ResearchPublication | null>(null);

  const price = publication.price ?? 0;
  const priceLabel = publication.isFree ? "Free" : formatGhc(price);

  const handlePay = async (paymentMethod: string) => {
    setSubmitting(true);
    setError("");
    try {
      await api.research.purchase(publication.id, paymentMethod);
      const updated = await api.research.get(publication.id);
      setUnlocked(updated);
      setPaid(true);
      onSuccess(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadNow = () => {
    const pub = unlocked ?? publication;
    onClose();
    onReadNow(pub);
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
            <AvatarWithVerification
              src={publication.researcher.profilePicture}
              name={publication.researcher.name}
              size="md"
              verificationStatus={publication.researcher.verificationStatus}
            />
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-lg font-bold text-brand-900">{publication.title}</h2>
              <p className="text-sm text-brand-700">by {publication.researcher.name}</p>
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
              title="Unlocked successfully"
              message={`You now have access to "${publication.title}".`}
              actionLabel="Read now"
              onAction={handleReadNow}
              onDismiss={onClose}
              dismissLabel="Close"
            />
          ) : isResearcher(userRoleId) ? (
            <p className="text-sm text-gray-600">Researchers cannot purchase publications.</p>
          ) : canPurchasePublication(userRoleId) ? (
            <>
              <p className="mb-4 text-sm text-gray-600">
                One-time fee to read this publication in the platform reader.
              </p>
              <PaymentCheckout
                totalLabel="Publication"
                totalAmount={priceLabel}
                subtitle={`Payment goes to ${publication.researcher.name}`}
                payLabel={`Pay ${priceLabel}`}
                onPay={handlePay}
                submitting={submitting}
                error={error}
              />
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Register as a Buyer or Student to purchase and read paid publications.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
