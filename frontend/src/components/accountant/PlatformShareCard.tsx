import { platformShareAmount, platformSharePercentOfTotal, DISTRIBUTION_SHARES } from "@/lib/handlerDisplayName";
import { formatGhc } from "@/lib/format";

interface PlatformShareCardProps {
  orderAmounts: number[];
  className?: string;
}

export function PlatformShareCard({ orderAmounts, className = "" }: PlatformShareCardProps) {
  const totalPlatformShare = orderAmounts.reduce((sum, amount) => sum + platformShareAmount(amount), 0);
  const referenceAmount = orderAmounts[0] ?? 100;
  const referencePercent = platformSharePercentOfTotal(referenceAmount);

  return (
    <div
      className={[
        "rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">ConcordiaOrbis</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-brand-900">{formatGhc(totalPlatformShare)}</p>
      <p className="mt-1 text-xs tabular-nums font-semibold text-brand-800">
        ~{referencePercent.toFixed(2)}% of each order
      </p>
      <p className="mt-1 text-[10px] text-gray-500">
        80% of platform share after Fellow ({DISTRIBUTION_SHARES.PLATFORM_POOL}% pool)
      </p>
    </div>
  );
}
