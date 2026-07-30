"use client";

import { useEffect } from "react";
import { PaymentStatusIcon, type PaymentStatusVariant } from "@/components/PaymentStatusIcon";

export interface PaymentResultOverlayProps {
  variant: PaymentStatusVariant;
  title?: string;
  message: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Auto-dismiss after ms (success only). Omit to require manual dismiss. */
  autoDismissMs?: number;
  /** Tighter layout for nested card modals (farm/publication access). */
  compact?: boolean;
  /** Inline centered layout — replaces modal body instead of absolute overlay. */
  embedded?: boolean;
}

const DEFAULT_TITLES: Record<PaymentStatusVariant, string> = {
  success: "Payment Successful",
  error: "Payment Failed",
};

export function PaymentResultOverlay({
  variant,
  title,
  message,
  hint,
  actionLabel,
  onAction,
  onDismiss,
  dismissLabel,
  autoDismissMs,
  compact = false,
  embedded = false,
}: PaymentResultOverlayProps) {
  const resolvedTitle = title ?? DEFAULT_TITLES[variant];
  const isSuccess = variant === "success";

  useEffect(() => {
    if (!isSuccess || !autoDismissMs || !onDismiss) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, isSuccess, onDismiss]);

  const primaryLabel = actionLabel ?? (isSuccess ? "Continue" : "Try Again");
  const secondaryLabel = dismissLabel ?? (isSuccess ? "Close" : "Cancel");
  const handlePrimary = onAction ?? onDismiss;

  const overlayClass = embedded
    ? "payment-result-embedded"
    : `payment-result-overlay${compact ? " payment-result-overlay--compact" : ""}`;

  const cardClass = embedded
    ? "payment-result-card payment-result-card--embedded"
    : `payment-result-card${compact ? " card-elevated" : ""}`;

  return (
    <div
      className={overlayClass}
      role={isSuccess ? "status" : "alertdialog"}
      aria-live="assertive"
      aria-labelledby="payment-result-title"
      aria-describedby="payment-result-message"
    >
      <div className={cardClass}>
        <PaymentStatusIcon
          variant={variant}
          size={compact || embedded ? "compact" : "default"}
        />
        <div className="payment-result-copy">
          <h2 id="payment-result-title" className="payment-result-title">
            {resolvedTitle}
          </h2>
          <p id="payment-result-message" className="payment-result-message">
            {message}
          </p>
          {hint && <p className="payment-result-hint">{hint}</p>}
        </div>
        <div className="payment-result-actions">
          {handlePrimary && (
            <button
              type="button"
              onClick={handlePrimary}
              className={isSuccess ? "btn-primary payment-result-btn" : "payment-result-btn payment-result-btn-error"}
            >
              {primaryLabel}
            </button>
          )}
          {onDismiss && onAction && (
            <button type="button" onClick={onDismiss} className="payment-result-btn-secondary">
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
