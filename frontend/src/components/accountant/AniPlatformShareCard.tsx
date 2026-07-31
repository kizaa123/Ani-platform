import { aniPlatformShareAmount, aniPlatformSharePercentOfTotal } from "@/lib/handlerDisplayName";
import { formatGhc } from "@/lib/format";

interface AniPlatformShareCardProps {
  orderAmounts: number[];
  className?: string;
}

export function AniPlatformShareCard({ orderAmounts, className = "" }: AniPlatformShareCardProps) {
  const totalAniShare = orderAmounts.reduce((sum, amount) => sum + aniPlatformShareAmount(amount), 0);
  const referenceAmount = orderAmounts[0] ?? 100;
  const referencePercent = aniPlatformSharePercentOfTotal(referenceAmount);

  return (
    <div
      className={[
        "rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">ANI</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-brand-900">{formatGhc(totalAniShare)}</p>
      <p className="mt-1 text-xs tabular-nums font-semibold text-brand-800">
        ~{referencePercent.toFixed(2)}% of each order
      </p>
      <p className="mt-1 text-[10px] text-gray-500">Remainder after Fellow and liaison officers</p>
    </div>
  );
}
