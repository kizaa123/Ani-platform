"use client";

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
  if (isBuyer(roleId)) return { prefix: "Client", separator: " " };
  if (isBuyerHandler(roleId)) return { prefix: "Client_Liason_Officer", separator: "_" };
  if (isFarmerHandler(roleId)) return { prefix: "Fellow_Liason_officer", separator: "_" };
  return null;
}

interface RolePrefixedNameProps {
  user: { roleId: number; firstName: string; lastName: string };
  className?: string;
  prefixClassName?: string;
  separatorClassName?: string;
  nameClassName?: string;
}

export function RolePrefixedName({
  user,
  className = "",
  prefixClassName = "text-brand-600",
  separatorClassName = "text-brand-400",
  nameClassName = "text-brand-900",
}: RolePrefixedNameProps) {
  const config = getRoleNamePrefix(user.roleId);
  const name = fullName(user);

  if (!config) {
    return <span className={[nameClassName, className].filter(Boolean).join(" ")}>{name}</span>;
  }

  return (
    <span className={["inline truncate", className].filter(Boolean).join(" ")}>
      <span className={prefixClassName}>{config.prefix}</span>
      {config.separator === "_" ? (
        <span className={separatorClassName}>_</span>
      ) : (
        <span aria-hidden="true"> </span>
      )}
      <span className={nameClassName}>{name}</span>
    </span>
  );
}
