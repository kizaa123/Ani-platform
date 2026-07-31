import {
  DISTRIBUTION_SHARES,
  aniPlatformShareAmount,
  aniPlatformSharePercentOfTotal,
  calculateDistributionAmounts,
} from "@/lib/handlerDisplayName";
import { formatGhc } from "@/lib/format";

export interface DistributionSplitLine {
  label: string;
  percentage: number;
  amount?: number;
  note?: string;
}

function buildDefaultSplitLines(orderAmount?: number): DistributionSplitLine[] {
  const handlerNote = "10% of post-Fellow remainder";

  if (orderAmount != null && orderAmount > 0) {
    const amounts = calculateDistributionAmounts(orderAmount);
    const aniPercent = aniPlatformSharePercentOfTotal(orderAmount);
    const handlerPercentOfTotal = (share: number) =>
      Math.round((share / orderAmount) * 10000) / 100;

    return [
      { label: "Fellow", percentage: DISTRIBUTION_SHARES.FARMER, amount: amounts.farmer },
      {
        label: "Fellow Liaison Officer",
        percentage: handlerPercentOfTotal(amounts.farmerHandler),
        amount: amounts.farmerHandler,
        note: handlerNote,
      },
      {
        label: "Client Liaison Officer",
        percentage: handlerPercentOfTotal(amounts.buyerHandler),
        amount: amounts.buyerHandler,
        note: handlerNote,
      },
      {
        label: "ANI",
        percentage: aniPercent,
        amount: amounts.aniPlatform,
        note: "Remainder after Fellow and handlers",
      },
    ];
  }

  return [
    { label: "Fellow", percentage: DISTRIBUTION_SHARES.FARMER },
    {
      label: "Fellow Liaison Officer",
      percentage: DISTRIBUTION_SHARES.FARMER_HANDLER,
      note: handlerNote,
    },
    {
      label: "Client Liaison Officer",
      percentage: DISTRIBUTION_SHARES.BUYER_HANDLER,
      note: handlerNote,
    },
    {
      label: "ANI",
      percentage: aniPlatformSharePercentOfTotal(100),
      note: "Remainder after Fellow and handlers",
    },
  ];
}

function SplitRow({ label, percentage, amount, note }: DistributionSplitLine) {
  return (
    <div className="text-xs text-gray-600">
      <div className="flex items-baseline gap-2">
        <span className="shrink-0">{label}</span>
        <span
          className="min-w-[1.5rem] flex-1 border-b border-dotted border-gray-300"
          aria-hidden="true"
        />
        <span className="shrink-0 tabular-nums font-semibold text-brand-900">
          {percentage.toFixed(2)}%
          {amount != null ? ` · ${formatGhc(amount)}` : ""}
        </span>
      </div>
      {note ? <p className="mt-0.5 pl-0 text-[10px] text-gray-500">{note}</p> : null}
    </div>
  );
}

interface DistributionSplitBreakdownProps {
  lines?: DistributionSplitLine[];
  fellowName?: string;
  /** Example order amount — shows GHC amounts alongside percentages. */
  orderAmount?: number;
  /** Hide ANI platform row — use AniPlatformShareCard for consolidated platform totals. */
  hidePlatformShare?: boolean;
  className?: string;
}

export function DistributionSplitBreakdown({
  lines,
  fellowName,
  orderAmount,
  hidePlatformShare = false,
  className = "",
}: DistributionSplitBreakdownProps) {
  const baseLines = lines ?? buildDefaultSplitLines(orderAmount);
  const resolvedLines = baseLines
    .filter((line) => !(hidePlatformShare && line.label === "ANI"))
    .map((line) =>
      line.label === "Fellow" && fellowName ? { ...line, label: fellowName } : line
    );

  return (
    <div className={["space-y-1.5", className].filter(Boolean).join(" ")}>
      {resolvedLines.map((line) => (
        <SplitRow key={line.label} {...line} />
      ))}
    </div>
  );
}

export { aniPlatformShareAmount };
