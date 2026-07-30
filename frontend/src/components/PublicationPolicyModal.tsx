"use client";

import { useState } from "react";
import { PUBLICATION_POLICY_DECLARATION } from "@/lib/publicationPolicyDeclaration";
import { SpinnerLabel } from "@/components/LoadingPrimitives";

interface PublicationPolicyModalProps {
  onAccept: () => Promise<void>;
  /** When false, the modal cannot be dismissed without accepting (portal gate). */
  dismissible?: boolean;
  onClose?: () => void;
}

export function PublicationPolicyModal({
  onAccept,
  dismissible = false,
  onClose,
}: PublicationPolicyModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!acknowledged) return;
    setSubmitting(true);
    setError("");
    try {
      await onAccept();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your acceptance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      onClick={dismissible ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="publication-policy-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-brand-100 bg-brand-50/70 px-5 py-4 sm:px-6">
          <div>
            <h2 id="publication-policy-title" className="text-lg font-bold text-brand-900 sm:text-xl">
              {PUBLICATION_POLICY_DECLARATION.title}
            </h2>
            <p className="mt-1 text-sm text-brand-700/90">{PUBLICATION_POLICY_DECLARATION.intro}</p>
          </div>
          {dismissible && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-brand-700"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <p className="mb-3 text-sm font-semibold text-brand-900">
            {PUBLICATION_POLICY_DECLARATION.confirmHeading}
          </p>
          <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-gray-700">
            {PUBLICATION_POLICY_DECLARATION.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <p className="mb-3 text-sm font-semibold text-brand-900">Acknowledgement</p>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-gray-800">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>{PUBLICATION_POLICY_DECLARATION.acknowledgementLabel}</span>
            </label>
            <p className="mt-3 text-xs text-gray-500">{PUBLICATION_POLICY_DECLARATION.checkboxHint}</p>
          </div>

          {error && <p className="auth-error mt-4">{error}</p>}
        </div>

        <div className="border-t border-brand-100 bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            disabled={!acknowledged || submitting}
            onClick={handleAccept}
          >
            {submitting ? <SpinnerLabel label="Saving..." className="h-4 w-4" /> : "Accept & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
