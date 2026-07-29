"use client";

export type PaymentStatusVariant = "success" | "error";

interface PaymentStatusIconProps {
  variant: PaymentStatusVariant;
  className?: string;
}

export function PaymentStatusIcon({ variant, className = "" }: PaymentStatusIconProps) {
  if (variant === "success") {
    return (
      <div className={`payment-status-icon payment-status-icon--success ${className}`} aria-hidden>
        <svg viewBox="0 0 120 120" className="h-28 w-28 sm:h-32 sm:w-32">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#bbf7d0"
            strokeWidth="4"
            className="payment-success-ring"
          />
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="#22c55e"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={1}
            className="payment-success-circle-stroke"
          />
          <circle cx="60" cy="60" r="46" fill="#22c55e" className="payment-success-circle-fill" />
          <path
            d="M38 62 L54 78 L84 44"
            fill="none"
            stroke="#ffffff"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="payment-success-check"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`payment-status-icon payment-status-icon--error ${className}`} aria-hidden>
      <svg viewBox="0 0 120 120" className="h-28 w-28 sm:h-32 sm:w-32">
        <circle cx="60" cy="60" r="46" fill="#ef4444" className="payment-error-circle" />
        <path
          d="M44 44 L76 76"
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
          pathLength={1}
          className="payment-error-x payment-error-x-1"
        />
        <path
          d="M76 44 L44 76"
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
          pathLength={1}
          className="payment-error-x payment-error-x-2"
        />
      </svg>
    </div>
  );
}
