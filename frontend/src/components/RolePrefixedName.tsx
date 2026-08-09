import { VerifiedBadgeIcon } from "@/components/VerificationBadge";
import { VerificationTags } from "@/components/VerificationTagBadge";
import {
  fullName,
  isBuyer,
  isBuyerHandler,
  isFarmer,
  isFarmerHandler,
  type UserVerificationTag,
} from "@/lib/types";

export type RolePrefixConfig = {
  prefix: string;
};

export function getRoleNamePrefix(roleId: number): RolePrefixConfig | null {
  if (isFarmer(roleId)) return { prefix: "Fellow" };
  if (isBuyer(roleId)) return { prefix: "Client" };
  if (isBuyerHandler(roleId)) return { prefix: "CLO" };
  if (isFarmerHandler(roleId)) return { prefix: "FLO" };
  return null;
}

export function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? displayName,
    lastName: parts.slice(1).join(" "),
  };
}

interface RolePrefixedNameProps {
  user: {
    roleId: number;
    firstName: string;
    lastName: string;
    verificationStatus?: string | null;
    verificationTags?: UserVerificationTag[];
  };
  verificationTags?: UserVerificationTag[];
  className?: string;
  prefixClassName?: string;
  /** @deprecated Separator is always a space between prefix and name. */
  separatorClassName?: string;
  nameClassName?: string;
  /** @deprecated Prefer verificationTags for inline badge display. */
  showVerifiedBadge?: boolean;
  tagSize?: "xs" | "sm" | "md";
  showTagLabels?: boolean;
  hideVerificationTags?: boolean;
  /**
   * When false, the tags never wrap below the name: long names truncate with
   * an ellipsis and the tags stay on the same row (e.g. narrow sidebars).
   */
  wrap?: boolean;
}

function InlineVerificationTags({
  verificationTags,
  verificationStatus,
  tagSize,
  showTagLabels,
}: {
  verificationTags?: UserVerificationTag[];
  verificationStatus?: string | null;
  tagSize: "xs" | "sm" | "md";
  showTagLabels?: boolean;
}) {
  if (verificationTags?.length || verificationStatus === "VERIFIED") {
    return (
      <VerificationTags
        verificationTags={verificationTags}
        verificationStatus={verificationStatus}
        size={tagSize}
        showLabels={showTagLabels}
        layout="row"
        className="shrink-0"
      />
    );
  }
  return null;
}

export function RolePrefixedName({
  user,
  verificationTags,
  className = "",
  prefixClassName = "text-brand-600",
  nameClassName = "text-brand-900",
  showVerifiedBadge = false,
  tagSize = "sm",
  showTagLabels = false,
  hideVerificationTags = false,
  wrap = true,
}: RolePrefixedNameProps) {
  const resolvedTags = verificationTags ?? user.verificationTags;
  const config = getRoleNamePrefix(user.roleId);
  const name =
    config &&
    (isFarmer(user.roleId) ||
      isBuyer(user.roleId) ||
      isFarmerHandler(user.roleId) ||
      isBuyerHandler(user.roleId))
      ? user.firstName
      : fullName(user);
  const isVerified = user.verificationStatus === "VERIFIED";
  const inlineTags = hideVerificationTags ? null : (
    <InlineVerificationTags
      verificationTags={resolvedTags}
      verificationStatus={user.verificationStatus}
      tagSize={tagSize}
      showTagLabels={showTagLabels}
    />
  );

  const nameLabel = config ? (
    <span className="inline-flex min-w-0 items-baseline">
      <span className={`shrink-0 ${prefixClassName}`}>{config.prefix}</span>
      <span aria-hidden="true">&nbsp;</span>
      <span className={`${wrap ? "" : "truncate"} ${nameClassName}`}>{name}</span>
    </span>
  ) : (
    <span className={`min-w-0 ${wrap ? "" : "truncate"} ${nameClassName}`}>{name}</span>
  );

  return (
    <span
      className={[
        "inline-flex max-w-full items-center gap-x-0.5 gap-y-0.5",
        wrap ? "flex-wrap" : "min-w-0 flex-nowrap",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {nameLabel}
      {inlineTags}
      {showVerifiedBadge && !hideVerificationTags && isVerified && !resolvedTags?.length && (
        <span title="Verified User">
          <VerifiedBadgeIcon className="h-4 w-4 shrink-0" />
        </span>
      )}
    </span>
  );
}
