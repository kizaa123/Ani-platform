import type { VerificationTagType } from "@/lib/types";

const TAG_STYLES: Record<
  VerificationTagType,
  { label: string; className: string }
> = {
  STANDARD: {
    label: "Verified",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  INTERNATIONAL_FARMER: {
    label: "International Fellow",
    className: "border-sky-200 bg-sky-100 text-sky-800",
  },
  INTERNATIONAL_BUYER: {
    label: "International Client",
    className: "border-violet-200 bg-violet-100 text-violet-800",
  },
};

export function VerificationTagBadge({
  tagType,
  className = "",
  onRemove,
  removing = false,
}: {
  tagType: VerificationTagType;
  className?: string;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const style = TAG_STYLES[tagType];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className} ${className}`}
    >
      {style.label}
      {onRemove && (
        <button
          type="button"
          disabled={removing}
          onClick={onRemove}
          className="ml-0.5 rounded-full px-1 text-[10px] leading-none opacity-70 hover:opacity-100 disabled:opacity-40"
          aria-label={`Remove ${style.label} tag`}
        >
          ×
        </button>
      )}
    </span>
  );
}
