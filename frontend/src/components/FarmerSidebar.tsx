"use client";

import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import type { UserProfile } from "@/lib/types";

export const FARMER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  { href: "/farm", label: "My Farm", icon: "wheat", match: (p) => p === "/farm" },
  {
    href: "/farm/financials",
    label: "Financials",
    icon: "chart",
    match: (p) => p.startsWith("/farm/financials"),
  },
  {
    href: "/farm/orders",
    label: "Buyer Orders",
    icon: "package",
    match: (p) => p.startsWith("/farm/orders"),
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: "store",
    match: (p) => p.startsWith("/marketplace"),
  },
  {
    href: "/connections",
    label: "Connections",
    icon: "handshake",
    match: (p) => p.startsWith("/connections"),
  },
  {
    href: "/farm/settings",
    label: "Profile",
    icon: "user",
    match: (p) => p.startsWith("/farm/settings"),
  },
];

function farmerSubtitle(user: UserProfile) {
  return user.farmerProfile?.farmName || user.role;
}

export function FarmerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalSidebarLayout
      navLinks={FARMER_NAV_LINKS}
      portalTitle="Farmer Portal"
      getSubtitle={farmerSubtitle}
      defaultMobileTitle="Farmer Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}

/** @deprecated Use FarmerPortalLayout — kept for imports that expect FarmerSidebar */
export function FarmerSidebar() {
  return null;
}
