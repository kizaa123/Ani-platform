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
  separator: "_" | " ";
};

export function getRoleNamePrefix(roleId: number): RolePrefixConfig | null {
  if (isFarmer(roleId)) return { prefix: "Fellow", separator: "_" };
  if (isBuyer(roleId)) return { prefix: "Client", separator: "_" };
  if (isBuyerHandler(roleId)) return { prefix: "CLO", separator: "_" };
  if (isFarmerHandler(roleId)) return { prefix: "FLO", separator: "_" };
  return null;
}

interface RolePrefixedNameProps {
  user: { roleId: number; firstName: string; lastName: string; verificationStatus?: string };
  verificationTags?: UserVerificationTag[];
  className?: string;
  prefixClassName?: string;
  separatorClassName?: string;
  nameClassName?: string;
  /** @deprecated Prefer verificationTags for inline badge display. */
  showVerifiedBadge?: boolean;
  tagSize?: "xs" | "sm" | "md";
  showTagLabels?: boolean;
}

function InlineVerificationTags({
  verificationTags,
  verificationStatus,
  tagSize,
  showTagLabels,
}: {
  verificationTags?: UserVerificationTag[];
  verificationStatus?: string;
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
  separatorClassName = "text-brand-400",
  nameClassName = "text-brand-900",
  showVerifiedBadge = false,
  tagSize = "sm",
  showTagLabels = false,
}: RolePrefixedNameProps) {
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
  const inlineTags = (
    <InlineVerificationTags
      verificationTags={verificationTags}
      verificationStatus={user.verificationStatus}
      tagSize={tagSize}
      showTagLabels={showTagLabels}
    />
  );

  if (!config) {
    return (
      <span
        className={[
          "inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={nameClassName}>{name}</span>
        {inlineTags}
        {showVerifiedBadge && isVerified && !verificationTags?.length && (
          <span title="Verified User">
            <VerifiedBadgeIcon className="h-4 w-4 shrink-0" />
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={prefixClassName}>{config.prefix}</span>
      {config.separator === "_" ? (
        <span className={separatorClassName}>_</span>
      ) : (
        <span aria-hidden="true"> </span>
      )}
      <span className={nameClassName}>{name}</span>
      {inlineTags}
      {showVerifiedBadge && isVerified && !verificationTags?.length && (
        <span title="Verified User">
          <VerifiedBadgeIcon className="h-4 w-4 shrink-0" />
        </span>
      )}
    </span>
  );
}
