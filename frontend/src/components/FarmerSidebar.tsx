"use client";

import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import type { UserProfile } from "@/lib/types";

export const FARMER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", match: (p) => p === "/dashboard" },
  { href: "/farm", label: "My Farm", icon: "🌾", match: (p) => p === "/farm" },
  {
    href: "/farm/financials",
    label: "Financials",
    icon: "📊",
    match: (p) => p.startsWith("/farm/financials"),
  },
  {
    href: "/farm/orders",
    label: "Buyer Orders",
    icon: "📦",
    match: (p) => p.startsWith("/farm/orders"),
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: "🏪",
    match: (p) => p.startsWith("/marketplace"),
  },
  {
    href: "/connections",
    label: "Connections",
    icon: "🤝",
    match: (p) => p.startsWith("/connections"),
  },
  {
    href: "/farm/settings",
    label: "Settings",
    icon: "⚙️",
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
