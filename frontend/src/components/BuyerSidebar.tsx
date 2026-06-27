"use client";

import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import type { UserProfile } from "@/lib/types";

export const BUYER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", match: (p) => p === "/dashboard" },
  { href: "/marketplace", label: "Marketplace", icon: "🏪", match: (p) => p.startsWith("/marketplace") },
  { href: "/access", label: "Buyer Access", icon: "💳", match: (p) => p.startsWith("/access") },
  { href: "/financials", label: "Financials", icon: "📊", match: (p) => p.startsWith("/financials") },
  { href: "/orders", label: "My Orders", icon: "📦", match: (p) => p.startsWith("/orders") },
  {
    href: "/connections",
    label: "Connections",
    icon: "🤝",
    match: (p) => p.startsWith("/connections"),
  },
  { href: "/settings", label: "Settings", icon: "⚙️", match: (p) => p.startsWith("/settings") },
];

function buyerSubtitle(user: UserProfile) {
  return user.buyerProfile?.company || user.role;
}

export function BuyerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalSidebarLayout
      navLinks={BUYER_NAV_LINKS}
      portalTitle="Buyer Portal"
      getSubtitle={buyerSubtitle}
      defaultMobileTitle="Buyer Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}
