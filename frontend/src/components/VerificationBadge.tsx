interface VerificationBadgeProps {
  status?: string | null;
  className?: string;
}

export function VerificationBadge({ status, className = "" }: VerificationBadgeProps) {
  if (!status) return null;

  const verified = status === "VERIFIED";
  const rejected = status === "REJECTED";

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        verified
          ? "bg-green-100 text-green-800"
          : rejected
            ? "bg-red-100 text-red-800"
            : "bg-yellow-100 text-yellow-900"
      } ${className}`}
    >
      {verified ? "Verified" : rejected ? "Rejected" : "Pending"}
    </span>
  );
}
