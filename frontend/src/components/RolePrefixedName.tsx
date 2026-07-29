import { VerifiedBadgeIcon } from "@/components/VerificationBadge";
import {
  fullName,
  isBuyer,
  isBuyerHandler,
  isFarmer,
  isFarmerHandler,
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
  className?: string;
  prefixClassName?: string;
  separatorClassName?: string;
  nameClassName?: string;
  showVerifiedBadge?: boolean;
}

export function RolePrefixedName({
  user,
  className = "",
  prefixClassName = "text-brand-600",
  separatorClassName = "text-brand-400",
  nameClassName = "text-brand-900",
  showVerifiedBadge = false,
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

  if (!config) {
    return (
      <span className={["inline-flex items-center gap-1", nameClassName, className].filter(Boolean).join(" ")}>
        <span>{name}</span>
        {showVerifiedBadge && isVerified && (
          <span title="Verified User">
            <VerifiedBadgeIcon className="h-4 w-4 shrink-0" />
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={["inline-flex items-center gap-1 truncate", className].filter(Boolean).join(" ")}>
      <span className={prefixClassName}>{config.prefix}</span>
      {config.separator === "_" ? (
        <span className={separatorClassName}>_</span>
      ) : (
        <span aria-hidden="true"> </span>
      )}
      <span className={nameClassName}>{name}</span>
      {showVerifiedBadge && isVerified && (
        <span title="Verified User">
          <VerifiedBadgeIcon className="h-4 w-4 shrink-0" />
        </span>
      )}
    </span>
  );
}
