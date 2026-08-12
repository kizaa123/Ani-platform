import {
  DISTRIBUTION_SHARES,
  platformSharePercentOfTotal,
  calculateDistributionAmounts,
  handlerSharePercentOfTotal,
} from "@/lib/handlerDisplayName";
import { formatGhc } from "@/lib/format";
import { PLATFORM_NAME } from "@/lib/site";

export interface DistributionSplitLine {
  label: string;
  percentage?: number;
  amount?: number;
  note?: string;
}

function formatSplitValue({ percentage, amount }: Pick<DistributionSplitLine, "percentage" | "amount">): string {
  if (amount != null && percentage == null) return formatGhc(amount);
  if (amount != null && percentage != null) return `${percentage.toFixed(2)}% · ${formatGhc(amount)}`;
  if (percentage != null) return `${percentage.toFixed(2)}%`;
  return "";
}

function buildDefaultSplitLines(orderAmount?: number): DistributionSplitLine[] {
  if (orderAmount != null && orderAmount > 0) {
    const amounts = calculateDistributionAmounts(orderAmount);
    const platformPercent = platformSharePercentOfTotal(orderAmount);

    return [
      { label: "Fellow", percentage: DISTRIBUTION_SHARES.FARMER, amount: amounts.farmer },
      {
        label: "Fellow Liaison Officer",
        percentage: handlerSharePercentOfTotal({ role: "FARMER_HANDLER" }),
        amount: amounts.farmerHandler,
      },
      {
        label: "Client Liaison Officer",
        percentage: handlerSharePercentOfTotal({ role: "BUYER_HANDLER" }),
        amount: amounts.buyerHandler,
      },
      {
        label: PLATFORM_NAME,
        percentage: platformPercent,
        amount: amounts.platformShare,
        note: `${DISTRIBUTION_SHARES.PLATFORM_RETAINED_POOL}% of platform share (${DISTRIBUTION_SHARES.PLATFORM_POOL}% after Fellow)`,
      },
    ];
  }

  return [
    { label: "Fellow", percentage: DISTRIBUTION_SHARES.FARMER },
    {
      label: "Fellow Liaison Officer",
      percentage: handlerSharePercentOfTotal({ role: "FARMER_HANDLER" }),
    },
    {
      label: "Client Liaison Officer",
      percentage: handlerSharePercentOfTotal({ role: "BUYER_HANDLER" }),
    },
    {
      label: PLATFORM_NAME,
      percentage: platformSharePercentOfTotal(100),
      note: `${DISTRIBUTION_SHARES.PLATFORM_RETAINED_POOL}% of platform share (${DISTRIBUTION_SHARES.PLATFORM_POOL}% after Fellow)`,
    },
  ];
}

function SplitRow({ label, percentage, amount, note }: DistributionSplitLine) {
  const valueText = formatSplitValue({ percentage, amount });

  return (
    <div className="text-xs text-gray-600">
      <div className="flex items-baseline gap-2">
        <span className="shrink-0">{label}</span>
        <span
          className="min-w-[1.5rem] flex-1 border-b border-dotted border-gray-300"
          aria-hidden="true"
        />
        <span className="shrink-0 tabular-nums font-semibold text-brand-900">{valueText}</span>
      </div>
      {note ? <p className="mt-0.5 pl-0 text-[10px] text-gray-500">{note}</p> : null}
    </div>
  );
}

interface DistributionSplitBreakdownProps {
  lines?: DistributionSplitLine[];
  fellowName?: string;
  /** Example order amount - shows GHC amounts alongside percentages. */
  orderAmount?: number;
  /** Hide platform share row - use PlatformShareCard for consolidated platform totals. */
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
    .filter((line) => !(hidePlatformShare && line.label === PLATFORM_NAME))
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

export { platformShareAmount } from "@/lib/handlerDisplayName";
