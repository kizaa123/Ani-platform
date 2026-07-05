"use client";

import { useAuth } from "@/context/AuthProvider";
import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import { ROLES, isHandler, isBuyerHandler, type UserProfile } from "@/lib/types";

export const HANDLER_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  {
    href: "/agents",
    label: "My Clients",
    icon: "users",
    match: (p) => p.startsWith("/agents") && !p.startsWith("/agents/settings"),
  },
  { href: "/marketplace", label: "Marketplace", icon: "store", match: (p) => p.startsWith("/marketplace") },
  { href: "/library", label: "Research Library", icon: "book", match: (p) => p.startsWith("/library") },
  { href: "/connections", label: "Connections", icon: "handshake", match: (p) => p.startsWith("/connections") },
  {
    href: "/agents/settings",
    label: "Profile",
    icon: "user",
    match: (p) => p.startsWith("/agents/settings"),
  },
];

function handlerNavLinks(roleId: number): PortalNavLink[] {
  const clientMatch = (p: string) =>
    p.startsWith("/agents") && !p.startsWith("/agents/settings");

  if (isBuyerHandler(roleId)) {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
      { href: "/agents", label: "My Buyers", icon: "users", match: clientMatch },
      { href: "/marketplace", label: "Marketplace", icon: "store", match: (p) => p.startsWith("/marketplace") },
      { href: "/connections", label: "Connections", icon: "handshake", match: (p) => p.startsWith("/connections") },
      {
        href: "/agents/settings",
        label: "Profile",
        icon: "user",
        match: (p) => p.startsWith("/agents/settings"),
      },
    ];
  }

  return HANDLER_NAV_LINKS;
}

function handlerPortalTitle(roleId: number) {
  return roleId === ROLES.BUYER_HANDLER ? "Buyer Handler Portal" : "Farmer Handler Portal";
}

export function HandlerPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const portalTitle = user ? handlerPortalTitle(user.roleId) : "Handler Portal";
  const navLinks = user ? handlerNavLinks(user.roleId) : HANDLER_NAV_LINKS;

  return (
    <PortalSidebarLayout
      navLinks={navLinks}
      portalTitle={portalTitle}
      getSubtitle={(u: UserProfile) => u.role}
      defaultMobileTitle="Handler Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}

export function useIsHandlerPortalRole(roleId?: number) {
  return roleId !== undefined && isHandler(roleId);
}
