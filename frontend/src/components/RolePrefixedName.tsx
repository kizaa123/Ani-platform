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
  if (isBuyer(roleId)) return { prefix: "CLIENT (BUYER)", separator: "_" };
  if (isBuyerHandler(roleId)) return { prefix: "Client_Liason_Officer", separator: "_" };
  if (isFarmerHandler(roleId)) return { prefix: "Fellow_Liason_officer", separator: "_" };
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
  showVerifiedBadge = true,
}: RolePrefixedNameProps) {
  const config = getRoleNamePrefix(user.roleId);
  const name = fullName(user);
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
