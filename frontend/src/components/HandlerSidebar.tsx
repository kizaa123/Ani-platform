"use client";

import { useAuth } from "@/context/AuthProvider";
import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import { ROLES, isHandler, isBuyerHandler } from "@/lib/types";

export const FLO_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  {
    href: "/agents/financials",
    label: "Financials",
    icon: "chart",
    match: (p) => p.startsWith("/agents/financials"),
  },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
  {
    href: "/agents/settings",
    label: "Profile",
    icon: "user",
    match: (p) => p.startsWith("/agents/settings"),
  },
];

export const CLO_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  {
    href: "/agents/financials",
    label: "Financials",
    icon: "chart",
    match: (p) => p.startsWith("/agents/financials"),
  },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
  {
    href: "/agents/settings",
    label: "Profile",
    icon: "user",
    match: (p) => p.startsWith("/agents/settings"),
  },
];

export const HANDLER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  {
    href: "/agents/financials",
    label: "Financials",
    icon: "chart",
    match: (p) => p.startsWith("/agents/financials"),
  },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
  {
    href: "/agents/settings",
    label: "Profile",
    icon: "user",
    match: (p) => p.startsWith("/agents/settings"),
  },
];

function handlerNavLinks(roleId: number): PortalNavLink[] {
  if (isBuyerHandler(roleId)) return CLO_NAV_LINKS;
  return FLO_NAV_LINKS;
}

function handlerPortalTitle(roleId: number) {
  return roleId === ROLES.BUYER_HANDLER
    ? "Client Liaison Officer Portal"
    : "Fellow Liaison Officer Portal";
}

export function HandlerPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const portalTitle = user ? handlerPortalTitle(user.roleId) : "Liaison Officer Portal";
  const navLinks = user ? handlerNavLinks(user.roleId) : HANDLER_NAV_LINKS;

  return (
    <PortalSidebarLayout
      navLinks={navLinks}
      portalTitle={portalTitle}
      defaultMobileTitle="Liaison Officer Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}

export function useIsHandlerPortalRole(roleId?: number) {
  return roleId !== undefined && isHandler(roleId);
}
