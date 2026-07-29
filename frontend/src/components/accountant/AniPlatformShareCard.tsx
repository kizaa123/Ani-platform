import { DISTRIBUTION_SHARES, aniPlatformShareAmount } from "@/lib/handlerDisplayName";
import { formatGhc } from "@/lib/format";

interface AniPlatformShareCardProps {
  orderAmounts: number[];
  className?: string;
}

export function AniPlatformShareCard({ orderAmounts, className = "" }: AniPlatformShareCardProps) {
  const orderCount = orderAmounts.length;
  const totalOrderValue = orderAmounts.reduce((sum, amount) => sum + amount, 0);
  const totalAniShare = orderAmounts.reduce((sum, amount) => sum + aniPlatformShareAmount(amount), 0);

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
      <p className="mt-1 text-xs text-gray-600">
        <span className="font-semibold tabular-nums text-brand-800">
          {DISTRIBUTION_SHARES.ANI.toFixed(2)}%
        </span>{" "}
        remainder after Fellow ({DISTRIBUTION_SHARES.FARMER.toFixed(2)}%), FLO (
        {DISTRIBUTION_SHARES.FARMER_HANDLER.toFixed(0)}%), and CLO (
        {DISTRIBUTION_SHARES.BUYER_HANDLER.toFixed(0)}%) shares
      </p>
      <p className="mt-2 text-[10px] text-gray-500">
        {orderCount} released order{orderCount === 1 ? "" : "s"} · {formatGhc(totalOrderValue)} total
        order value
      </p>
    </div>
  );
}
