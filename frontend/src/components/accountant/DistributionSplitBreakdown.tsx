import { DISTRIBUTION_SHARES } from "@/lib/handlerDisplayName";

export interface DistributionSplitLine {
  label: string;
  percentage: number;
}

const DEFAULT_SPLIT_LINES: DistributionSplitLine[] = [
  { label: "Fellow", percentage: DISTRIBUTION_SHARES.FARMER },
  { label: "Fellow Liaison Officer", percentage: DISTRIBUTION_SHARES.FARMER_HANDLER },
  { label: "Client Liaison Officer", percentage: DISTRIBUTION_SHARES.BUYER_HANDLER },
  { label: "ANI", percentage: DISTRIBUTION_SHARES.ANI },
];

function SplitRow({ label, percentage }: DistributionSplitLine) {
  return (
    <div className="flex items-baseline gap-2 text-xs text-gray-600">
      <span className="shrink-0">{label}</span>
      <span
        className="min-w-[1.5rem] flex-1 border-b border-dotted border-gray-300"
        aria-hidden="true"
      />
      <span className="shrink-0 tabular-nums font-semibold text-brand-900">
        {percentage.toFixed(2)}%
      </span>
    </div>
  );
}

interface DistributionSplitBreakdownProps {
  lines?: DistributionSplitLine[];
  fellowName?: string;
  /** Hide ANI platform row — use AniPlatformShareCard for consolidated platform totals. */
  hidePlatformShare?: boolean;
  className?: string;
}

export function DistributionSplitBreakdown({
  lines,
  fellowName,
  hidePlatformShare = false,
  className = "",
}: DistributionSplitBreakdownProps) {
  const baseLines = lines ?? DEFAULT_SPLIT_LINES;
  const resolvedLines = baseLines
    .filter((line) => !(hidePlatformShare && line.label === "ANI"))
    .map((line) =>
      line.label === "Fellow" && fellowName ? { ...line, label: fellowName } : line
    );

  return (
    <div className={["space-y-1", className].filter(Boolean).join(" ")}>
      {resolvedLines.map((line) => (
        <SplitRow key={line.label} label={line.label} percentage={line.percentage} />
      ))}
    </div>
  );
}
