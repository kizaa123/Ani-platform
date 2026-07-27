import { Icon, type IconName } from "@/components/icons";

export function VerifiedBadgeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block shrink-0 ${className}`}
      aria-label="Verified"
    >
      {/* Green filled scalloped badge shape (ri-verified-badge-fill) */}
      <path
        fill="#10B981"
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.25 1.273 2.62 2.148 4.2 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.25 2.148-2.62 2.148-4.2z"
      />
      {/* White checkmark inside */}
      <path
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12.2l2.6 2.6 5.4-5.4"
      />
    </svg>
  );
}

interface VerificationBadgeProps {
  status?: string | null;
  className?: string;
  showIconOnly?: boolean;
}

export function VerificationBadge({
  status,
  className = "",
  showIconOnly = false,
}: VerificationBadgeProps) {
  if (!status) return null;

  const verified = status === "VERIFIED";
  const rejected = status === "REJECTED";

  const label = verified ? "Verified" : rejected ? "Rejected" : "Pending";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs transition ${
        verified
          ? "border border-emerald-200 bg-emerald-100 text-emerald-800"
          : rejected
            ? "border border-red-200 bg-red-100 text-red-800"
            : "border border-amber-200 bg-amber-100 text-amber-900"
      } ${className}`}
    >
      {verified ? (
        <VerifiedBadgeIcon className="h-4 w-4" />
      ) : (
        <Icon name={rejected ? "x-circle" : "clock"} className="h-3.5 w-3.5 shrink-0" />
      )}
      {!showIconOnly && <span>{label}</span>}
    </span>
  );
}
