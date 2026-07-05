"use client";

import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import type { UserProfile } from "@/lib/types";

export const RESEARCHER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  {
    href: "/researcher/publications",
    label: "Publications",
    icon: "book",
    match: (p) => p.startsWith("/researcher/publications"),
  },
  {
    href: "/library",
    label: "Research Library",
    icon: "search",
    match: (p) => p.startsWith("/library"),
  },
  {
    href: "/researcher/financials",
    label: "Financials",
    icon: "chart",
    match: (p) => p.startsWith("/researcher/financials"),
  },
  {
    href: "/researcher/settings",
    label: "Profile",
    icon: "user",
    match: (p) => p.startsWith("/researcher/settings"),
  },
];

function researcherSubtitle(user: UserProfile) {
  return user.researcherProfile?.institution || user.role;
}

export function ResearcherPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalSidebarLayout
      navLinks={RESEARCHER_NAV_LINKS}
      portalTitle="Researcher Portal"
      getSubtitle={researcherSubtitle}
      defaultMobileTitle="Researcher Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}
