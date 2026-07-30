"use client";

import { useState } from "react";
import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import { PublicationPolicyModal } from "@/components/PublicationPolicyModal";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { hasAcceptedPublicationPolicy, type UserProfile } from "@/lib/types";

export const RESEARCHER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: "store",
    match: (p) => p.startsWith("/marketplace"),
  },
  {
    href: "/researcher/publications",
    label: "Publications",
    icon: "book",
    match: (p) => p.startsWith("/researcher/publications"),
  },
  {
    href: "/researcher/clients",
    label: "Clients",
    icon: "users",
    match: (p) => p.startsWith("/researcher/clients"),
  },
  {
    href: "/library",
    label: "Research Library",
    icon: "search",
    match: (p) => p.startsWith("/library"),
  },
  { href: "/orders", label: "My Orders", icon: "package", match: (p) => p.startsWith("/orders") },
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
  const { user, refreshUser } = useAuth();
  const [policyAcceptedLocally, setPolicyAcceptedLocally] = useState(false);

  const needsPolicyAcceptance =
    !!user && !hasAcceptedPublicationPolicy(user) && !policyAcceptedLocally;

  const handleAcceptPolicy = async () => {
    await api.research.acceptPublicationPolicy();
    await refreshUser();
    setPolicyAcceptedLocally(true);
  };

  return (
    <PortalSidebarLayout
      navLinks={RESEARCHER_NAV_LINKS}
      portalTitle="Researcher Portal"
      getSubtitle={researcherSubtitle}
      defaultMobileTitle="Researcher Portal"
    >
      {children}
      {needsPolicyAcceptance && <PublicationPolicyModal onAccept={handleAcceptPolicy} />}
    </PortalSidebarLayout>
  );
}
