"use client";

import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";

export const FARMER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  { href: "/farm", label: "My Production", icon: "wheat", match: (p) => p === "/farm" },
  {
    href: "/farm/financials",
    label: "Financials",
    icon: "chart",
    match: (p) => p.startsWith("/farm/financials"),
  },
  {
    href: "/farm/orders",
    label: "Client Orders",
    icon: "package",
    match: (p) => p.startsWith("/farm/orders"),
  },
  {
    href: "/farm/clients",
    label: "Clients",
    icon: "users",
    match: (p) => p.startsWith("/farm/clients"),
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: "store",
    match: (p) => p.startsWith("/marketplace"),
  },
  {
    href: "/orders",
    label: "My Order",
    icon: "package",
    match: (p) => p.startsWith("/orders"),
  },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
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

export function FarmerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalSidebarLayout
      navLinks={FARMER_NAV_LINKS}
      portalTitle="Fellow Portal"
      defaultMobileTitle="Fellow Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}

/** @deprecated Use FarmerPortalLayout - kept for imports that expect FarmerSidebar */
export function FarmerSidebar() {
  return null;
}
