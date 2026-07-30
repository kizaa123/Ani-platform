"use client";

import { useAuth } from "@/context/AuthProvider";
import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import { ROLES, isAdmin, type UserProfile } from "@/lib/types";

export const ADMIN_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  { href: "/marketplace", label: "Marketplace", icon: "store", match: (p) => p.startsWith("/marketplace") },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
  {
    href: "/connections",
    label: "Connections",
    icon: "handshake",
    match: (p) => p.startsWith("/connections"),
  },
  { href: "/admin", label: "Admin", icon: "shield", match: (p) => p === "/admin" },
  { href: "/admin/staff", label: "ANI Team", icon: "users", match: (p) => p.startsWith("/admin/staff") },
  { href: "/admin/financials", label: "Financials", icon: "chart", match: (p) => p.startsWith("/admin/financials") },
  { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
];

export const ACCOUNTANT_NAV_LINKS: PortalNavLink[] = [
  {
    href: "/accountant",
    label: "Financial Overview",
    icon: "chart",
    match: (p) => p === "/accountant",
    section: "Summary",
  },
  {
    href: "/accountant/transactions",
    label: "Access Ledger",
    icon: "credit-card",
    match: (p) => p.startsWith("/accountant/transactions"),
    section: "Access income",
  },
  {
    href: "/accountant/farm-access",
    label: "Farm Access Approvals",
    icon: "handshake",
    match: (p) => p.startsWith("/accountant/farm-access"),
    section: "Access income",
  },
  {
    href: "/accountant/withdrawals",
    label: "Order share",
    icon: "coins",
    match: (p) => p.startsWith("/accountant/withdrawals"),
    section: "Order shared",
  },
  {
    href: "/accountant/receipts",
    label: "Order Receipts",
    icon: "package",
    match: (p) => p.startsWith("/accountant/receipts"),
    section: "Order shared",
  },
  { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile"), section: "Account" },
];

/** @deprecated Use ADMIN_NAV_LINKS or ACCOUNTANT_NAV_LINKS */
export const STAFF_NAV_LINKS = ADMIN_NAV_LINKS;

export const STAFF_GENERAL_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  { href: "/marketplace", label: "Marketplace", icon: "store", match: (p) => p.startsWith("/marketplace") },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
  { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
];

function staffPortalTitle(roleId: number) {
  if (roleId === ROLES.ADMIN) return "Admin Portal";
  if (roleId === ROLES.ANI_ACCOUNTANT) return "Accountant Portal";
  if (roleId === ROLES.CTO) return "CTO Portal";
  if (roleId === ROLES.COMMUNICATION_OFFICER) return "Communications Portal";
  return "Staff Portal";
}

function navLinksForRole(roleId: number): PortalNavLink[] {
  if (isAdmin(roleId)) return ADMIN_NAV_LINKS;
  if (roleId === ROLES.ANI_ACCOUNTANT) return ACCOUNTANT_NAV_LINKS;
  return STAFF_GENERAL_NAV_LINKS;
}

export function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const portalTitle = user ? staffPortalTitle(user.roleId) : "Staff Portal";
  const navLinks = user ? navLinksForRole(user.roleId) : ADMIN_NAV_LINKS;

  return (
    <PortalSidebarLayout
      navLinks={navLinks}
      portalTitle={portalTitle}
      getSubtitle={(u: UserProfile) => u.role}
      defaultMobileTitle="Staff Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}
