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
        className="relative -mt-6 flex flex-col items-center gap-1 transition-transform active:scale-95 duration-200"
      >
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
            active
              ? "bg-brand-900 text-white ring-4 ring-brand-100 shadow-brand-900/40"
              : "bg-brand-700 text-white hover:bg-brand-800 shadow-brand-700/30"
          }`}
        >
          <Icon name="plus" className="h-7 w-7" />
        </span>
        <span
          className={`text-[10px] font-bold tracking-wide uppercase ${
            active ? "text-brand-900" : "text-gray-500"
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
      className="relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2 px-1 transition duration-300 active:scale-95"
    >
      <div className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 transition-all duration-300 ${
        active ? "bg-brand-50 text-brand-800 shadow-[inset_0_1px_2px_rgba(27,67,50,0.06)]" : "text-gray-500 hover:text-brand-700"
      }`}>
        <Icon
          name={item.icon}
          className={`h-5 w-5 shrink-0 transition-transform duration-300 ${active ? "scale-110 text-brand-750" : "text-current"}`}
        />
        <span className={`truncate text-[10px] font-medium leading-none ${active ? "font-bold" : ""}`}>
          {item.label}
        </span>
      </div>
      {active && (
        <span className="absolute bottom-0 h-1 w-1 rounded-full bg-yellow-500" />
      )}
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
      className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-lg rounded-2xl border border-brand-100/80 bg-white/90 shadow-[0_12px_32px_rgba(27,67,50,0.12)] backdrop-blur-md lg:hidden"
    >
      <div className="flex items-end justify-around px-3 py-1.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

/** Bottom padding for main content so it clears the fixed nav on mobile */
export const MOBILE_BOTTOM_NAV_PADDING = "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0";
