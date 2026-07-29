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
    className: "border-sky-200 bg-sky-100 text-sky-800",
  },
  INTERNATIONAL_BUYER: {
    label: "International Client",
    className: "border-violet-200 bg-violet-100 text-violet-800",
  },
};

const TAG_ICON_COLORS: Record<Exclude<VerificationTagType, "STANDARD">, string> = {
  INTERNATIONAL_FARMER: "#0EA5E9",
  INTERNATIONAL_BUYER: "#8B5CF6",
};

const BADGE_SHAPE =
  "M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.25 1.273 2.62 2.148 4.2 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.25 2.148-2.62 2.148-4.2z";

const AVATAR_BADGE_POSITIONS = [
  "absolute -bottom-0.5 -right-0.5 z-10",
  "absolute -bottom-0.5 -left-0.5 z-10",
  "absolute -top-0.5 -right-0.5 z-10",
] as const;

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
  if (tagType === "STANDARD") {
    return <VerifiedBadgeIcon className={className} />;
  }

  const fill = TAG_ICON_COLORS[tagType];
  const label = TAG_STYLES[tagType].label;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block shrink-0 ${className}`}
      aria-label={label}
    >
      <path fill={fill} d={BADGE_SHAPE} />
      <circle cx="12" cy="12" r="4.25" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
      <ellipse cx="12" cy="12" rx="1.6" ry="4.25" stroke="#FFFFFF" strokeWidth="1.4" fill="none" />
      <path stroke="#FFFFFF" strokeWidth="1.4" d="M7.75 12h8.5M12 7.75v8.5" />
    </svg>
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

export { AVATAR_BADGE_POSITIONS, TAG_STYLES };
