"use client";

import { PortalSidebarLayout, type PortalNavLink } from "@/components/PortalSidebarLayout";

export const STUDENT_NAV_LINKS: PortalNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", match: (p) => p === "/dashboard" },
  {
    href: "/library",
    label: "Research Library",
    icon: "book",
    match: (p) => p.startsWith("/library"),
  },
  {
    href: "/student/settings",
    label: "Profile",
    icon: "user",
    match: (p) => p.startsWith("/student/settings"),
  },
];

export function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalSidebarLayout
      navLinks={STUDENT_NAV_LINKS}
      portalTitle="Student Portal"
      defaultMobileTitle="Student Portal"
    >
      {children}
    </PortalSidebarLayout>
  );
}
