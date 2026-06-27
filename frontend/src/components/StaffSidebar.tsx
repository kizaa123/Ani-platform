"use client";

import { useAuth } from "@/context/AuthProvider";
import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";
import { ROLES, type UserProfile } from "@/lib/types";

export const STAFF_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", match: (p) => p === "/dashboard" },
  { href: "/marketplace", label: "Marketplace", icon: "🏪", match: (p) => p.startsWith("/marketplace") },
  {
    href: "/connections",
    label: "Connections",
    icon: "🤝",
    match: (p) => p.startsWith("/connections"),
  },
  { href: "/admin", label: "Admin", icon: "🛡️", match: (p) => p.startsWith("/admin") },
  { href: "/profile", label: "Profile", icon: "👤", match: (p) => p.startsWith("/profile") },
];

function staffPortalTitle(roleId: number) {
  if (roleId === ROLES.ADMIN) return "Admin Portal";
  if (roleId === ROLES.ANI_ACCOUNTANT) return "Accountant Portal";
  return "Staff Portal";
}

export function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const portalTitle = user ? staffPortalTitle(user.roleId) : "Staff Portal";

  return (
    <PortalSidebarLayout
      navLinks={STAFF_NAV_LINKS}
      portalTitle={portalTitle}
      getSubtitle={(u: UserProfile) => u.role}
      defaultMobileTitle="Staff Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}
