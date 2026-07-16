"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { Icon, type IconName } from "@/components/icons";
import { isFarmer, isBuyer, isHandler, isResearcher, isStaff } from "@/lib/types";

export type BottomNavItem = {
  href: string;
  label: string;
  icon: IconName;
  match: (pathname: string) => boolean;
  /** Center create/upload action — larger circular button */
  create?: boolean;
};

function farmerNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/marketplace", label: "Market", icon: "store", match: (p) => p.startsWith("/marketplace") },
    {
      href: "/farm",
      label: "Create",
      icon: "plus",
      match: (p) => p === "/farm",
      create: true,
    },
    {
      href: "/farm/orders",
      label: "Orders",
      icon: "package",
      match: (p) => p.startsWith("/farm/orders"),
    },
    {
      href: "/farm/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/farm/settings"),
    },
  ];
}

function buyerNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/marketplace", label: "Market", icon: "store", match: (p) => p.startsWith("/marketplace") },
    { href: "/library", label: "Library", icon: "book", match: (p) => p.startsWith("/library") },
    { href: "/orders", label: "Orders", icon: "package", match: (p) => p.startsWith("/orders") },
    { href: "/settings", label: "Profile", icon: "user", match: (p) => p.startsWith("/settings") },
  ];
}

function researcherNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/library", label: "Market", icon: "book", match: (p) => p.startsWith("/library") },
    {
      href: "/researcher/publications",
      label: "Create",
      icon: "plus",
      match: (p) => p.startsWith("/researcher/publications"),
      create: true,
    },
    {
      href: "/researcher/financials",
      label: "Orders",
      icon: "package",
      match: (p) => p.startsWith("/researcher/financials"),
    },
    {
      href: "/researcher/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/researcher/settings"),
    },
  ];
}

function handlerNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/marketplace", label: "Market", icon: "store", match: (p) => p.startsWith("/marketplace") },
    {
      href: "/agents",
      label: "Clients",
      icon: "users",
      match: (p) => p.startsWith("/agents") && !p.startsWith("/agents/settings"),
    },
    {
      href: "/connections",
      label: "Connect",
      icon: "handshake",
      match: (p) => p.startsWith("/connections"),
    },
    {
      href: "/agents/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/agents/settings"),
    },
  ];
}

function staffNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/marketplace", label: "Market", icon: "store", match: (p) => p.startsWith("/marketplace") },
    { href: "/library", label: "Library", icon: "book", match: (p) => p.startsWith("/library") },
    { href: "/admin", label: "Admin", icon: "shield", match: (p) => p.startsWith("/admin") },
    { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
  ];
}

function navForRole(roleId: number): BottomNavItem[] | null {
  if (isFarmer(roleId)) return farmerNav();
  if (isBuyer(roleId)) return buyerNav();
  if (isResearcher(roleId)) return researcherNav();
  if (isHandler(roleId)) return handlerNav();
  if (isStaff(roleId)) return staffNav();
  return null;
}

function NavLink({ item, active }: { item: BottomNavItem; active: boolean }) {
  if (item.create) {
    return (
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className="relative -mt-5 flex flex-col items-center gap-0.5"
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition ${
            active
              ? "bg-brand-900 text-white ring-2 ring-brand-200"
              : "bg-brand-700 text-white hover:bg-brand-800"
          }`}
        >
          <Icon name="plus" className="h-6 w-6" />
        </span>
        <span
          className={`text-[10px] font-medium leading-tight ${
            active ? "text-brand-800" : "text-gray-500"
          }`}
        >
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 transition ${
        active ? "text-brand-800" : "text-gray-500 hover:text-brand-700"
      }`}
    >
      <Icon
        name={item.icon}
        className={`h-6 w-6 shrink-0 ${active ? "text-brand-700" : "text-current"}`}
      />
      <span className={`truncate text-[10px] font-medium leading-tight ${active ? "font-semibold" : ""}`}>
        {item.label}
      </span>
    </Link>
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const items = navForRole(user.roleId);
  if (!items) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-200 bg-white/95 shadow-[0_-4px_16px_rgba(27,67,50,0.08)] backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pt-2 pb-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

/** Bottom padding for main content so it clears the fixed nav on mobile */
export const MOBILE_BOTTOM_NAV_PADDING = "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0";
