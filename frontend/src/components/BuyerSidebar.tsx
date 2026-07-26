"use client";

import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";

export const BUYER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  { href: "/marketplace", label: "Marketplace", icon: "store", match: (p) => p.startsWith("/marketplace") },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
  { href: "/access", label: "Buyer Access", icon: "credit-card", match: (p) => p.startsWith("/access") },
  { href: "/financials", label: "Financials", icon: "chart", match: (p) => p.startsWith("/financials") },
  { href: "/orders", label: "My Orders", icon: "package", match: (p) => p.startsWith("/orders") },
  {
    href: "/connections",
    label: "Connections",
    icon: "handshake",
    match: (p) => p.startsWith("/connections"),
  },
  { href: "/settings", label: "Profile", icon: "user", match: (p) => p.startsWith("/settings") },
];

export function BuyerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalSidebarLayout
      navLinks={BUYER_NAV_LINKS}
      portalTitle="Buyer Portal"
      defaultMobileTitle="Buyer Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}
