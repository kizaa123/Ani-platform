import { Icon, type IconName } from "@/components/icons";

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

  const iconName: IconName = verified ? "check-circle" : rejected ? "x-circle" : "clock";
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
      <Icon name={iconName} className="h-3.5 w-3.5 shrink-0" />
      {!showIconOnly && <span>{label}</span>}
    </span>
  );
}
