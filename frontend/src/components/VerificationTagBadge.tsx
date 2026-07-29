import { VerifiedBadgeIcon } from "@/components/VerificationBadge";
import type { UserVerificationTag, VerificationTagType } from "@/lib/types";

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
    className: "border-red-200 bg-red-100 text-red-800",
  },
  INTERNATIONAL_BUYER: {
    label: "International Client",
    className: "border-red-200 bg-red-100 text-red-800",
  },
};

const TAG_ICON_FILLS: Record<VerificationTagType, string> = {
  STANDARD: "#10B981",
  INTERNATIONAL_FARMER: "#EF4444",
  INTERNATIONAL_BUYER: "#EF4444",
};

export function getAvatarVerificationBadges(
  verificationTags: UserVerificationTag[] | undefined,
  verificationStatus?: string | null
): VerificationTagType[] {
  const tagTypes = new Set(verificationTags?.map((tag) => tag.tagType) ?? []);
  const badges: VerificationTagType[] = [];

  if (tagTypes.has("INTERNATIONAL_FARMER")) badges.push("INTERNATIONAL_FARMER");
  if (tagTypes.has("INTERNATIONAL_BUYER")) badges.push("INTERNATIONAL_BUYER");
  if (tagTypes.has("STANDARD") || verificationStatus === "VERIFIED") {
    badges.push("STANDARD");
  }

  return badges;
}

export function VerificationTagIcon({
  tagType,
  className = "h-4 w-4",
}: {
  tagType: VerificationTagType;
  className?: string;
}) {
  const label = TAG_STYLES[tagType].label;

  return (
    <VerifiedBadgeIcon
      className={className}
      fill={TAG_ICON_FILLS[tagType]}
      aria-label={label}
    />
  );
}

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

export { TAG_STYLES };
