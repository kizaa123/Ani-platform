import type { ReactNode } from "react";
import { VerifiedBadgeIcon } from "@/components/VerificationBadge";
import type { UserVerificationTag, VerificationTagType } from "@/lib/types";

const TAG_PILL_STYLES: Record<
  VerificationTagType,
  { label: string; shortLabel: string; className: string }
> = {
  STANDARD: {
    label: "Verified",
    shortLabel: "Verified",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  INTERNATIONAL_FARMER: {
    label: "International Fellow",
    shortLabel: "Intl. Fellow",
    className: "border-red-200 bg-red-100 text-red-800",
  },
  INTERNATIONAL_BUYER: {
    label: "International Client",
    shortLabel: "Intl. Client",
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

  if (tagTypes.has("STANDARD") || verificationStatus === "VERIFIED") {
    badges.push("STANDARD");
  }
  if (tagTypes.has("INTERNATIONAL_FARMER")) badges.push("INTERNATIONAL_FARMER");
  if (tagTypes.has("INTERNATIONAL_BUYER")) badges.push("INTERNATIONAL_BUYER");

  return badges;
}

export function VerificationTagIcon({
  tagType,
  className = "h-4 w-4",
  decorative = false,
}: {
  tagType: VerificationTagType;
  className?: string;
  /** When true, hide from screen readers (parent provides aria-label). */
  decorative?: boolean;
}) {
  const label = TAG_PILL_STYLES[tagType].label;

  return (
    <VerifiedBadgeIcon
      className={className}
      fill={TAG_ICON_FILLS[tagType]}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    />
  );
}

type TagBadgeSize = "xs" | "sm" | "md";

const BADGE_ICON_SIZE: Record<TagBadgeSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

const BADGE_CIRCLE_SIZE: Record<TagBadgeSize, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-7 w-7",
};

export function VerificationTagBadge({
  tagType,
  size = "md",
  showLabel,
  className = "",
  onRemove,
  removing = false,
}: {
  tagType: VerificationTagType;
  size?: TagBadgeSize;
  /** When true, show pill with text (admin/management). Default: icon-only circle. */
  showLabel?: boolean;
  className?: string;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const style = TAG_PILL_STYLES[tagType];
  const labelVisible = showLabel ?? false;
  const label = size === "sm" ? style.shortLabel : style.label;

  if (!labelVisible) {
    return (
      <span
        role="img"
        aria-label={style.label}
        title={style.label}
        className={`inline-flex shrink-0 items-center justify-center ${BADGE_CIRCLE_SIZE[size]} ${className}`}
      >
        <VerificationTagIcon
          tagType={tagType}
          className={BADGE_ICON_SIZE[size]}
          decorative
        />
      </span>
    );
  }

  const sizeClasses: Record<TagBadgeSize, string> = {
    xs: "gap-0.5 px-1.5 py-0.5 text-[9px]",
    sm: "gap-1 px-2 py-0.5 text-[10px]",
    md: "gap-1 px-2.5 py-0.5 text-xs",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border font-semibold uppercase tracking-wide ${style.className} ${sizeClasses[size]} ${className}`}
      title={style.label}
    >
      <VerificationTagIcon tagType={tagType} className={BADGE_ICON_SIZE[size]} />
      <span>{label}</span>
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

export function VerificationTags({
  verificationTags,
  verificationStatus,
  size = "sm",
  showLabels,
  layout = "row",
  className = "",
  badgeClassName = "",
}: {
  verificationTags?: UserVerificationTag[];
  verificationStatus?: string | null;
  size?: TagBadgeSize;
  /** When true, show pill labels. Default: icon-only circles for profile display. */
  showLabels?: boolean;
  layout?: "row" | "stack";
  className?: string;
  badgeClassName?: string;
}) {
  const badges = getAvatarVerificationBadges(verificationTags, verificationStatus);
  if (badges.length === 0) return null;

  const labelVisible = showLabels ?? false;

  return (
    <span
      className={`inline-flex max-w-full ${
        layout === "row" ? "flex-row flex-wrap" : "flex-col"
      } items-center ${labelVisible ? "gap-1.5" : "gap-1"} ${className}`}
    >
      {badges.map((tagType) => (
        <VerificationTagBadge
          key={tagType}
          tagType={tagType}
          size={size}
          showLabel={labelVisible}
          className={badgeClassName}
        />
      ))}
    </span>
  );
}

/** Username (or role-prefixed name) with verification badges inline after the name. */
export function InlineNameWithVerificationTags({
  name,
  verificationTags,
  verificationStatus,
  nameClassName = "",
  tagSize = "sm",
  showLabels = false,
  className = "",
}: {
  name: ReactNode;
  verificationTags?: UserVerificationTag[];
  verificationStatus?: string | null;
  nameClassName?: string;
  tagSize?: TagBadgeSize;
  showLabels?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}
    >
      <span className={`min-w-0 ${nameClassName}`}>{name}</span>
      <VerificationTags
        verificationTags={verificationTags}
        verificationStatus={verificationStatus}
        size={tagSize}
        showLabels={showLabels}
        layout="row"
        className="shrink-0"
      />
    </span>
  );
}

export { TAG_PILL_STYLES as TAG_STYLES };
