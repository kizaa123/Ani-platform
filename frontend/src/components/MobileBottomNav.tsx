"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { Icon, type IconName } from "@/components/icons";
import { isFarmer, isBuyer, isHandler, isResearcher, isAdmin, isAccountant, isAccountantApproved, isStudent, isStaff, isFarmerHandler, isBuyerHandler } from "@/lib/types";

export type BottomNavItem = {
  href: string;
  label: string;
  icon: IconName;
  match: (pathname: string) => boolean;
  /** Center create/upload action - larger circular button */
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
      href: "/farm/financials",
      label: "Financials",
      icon: "chart",
      match: (p) => p.startsWith("/farm/financials"),
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
    { href: "/financials", label: "Financials", icon: "chart", match: (p) => p.startsWith("/financials") },
    { href: "/settings", label: "Profile", icon: "user", match: (p) => p.startsWith("/settings") },
  ];
}

function researcherNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/marketplace", label: "Market", icon: "store", match: (p) => p.startsWith("/marketplace") },
    {
      href: "/researcher/publications",
      label: "Create",
      icon: "plus",
      match: (p) => p.startsWith("/researcher/publications"),
      create: true,
    },
    { href: "/orders", label: "Orders", icon: "package", match: (p) => p.startsWith("/orders") },
    {
      href: "/researcher/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/researcher/settings"),
    },
  ];
}

function studentNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/library", label: "Library", icon: "book", match: (p) => p.startsWith("/library") },
    {
      href: "/student/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/student/settings"),
    },
  ];
}

function farmerHandlerNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/library", label: "Library", icon: "book", match: (p) => p.startsWith("/library") },
    {
      href: "/agents",
      label: "Fellows",
      icon: "users",
      match: (p) =>
        (p === "/agents" || p.startsWith("/agents/farm/") || p.startsWith("/agents/buyer/")) &&
        !p.startsWith("/agents/settings"),
    },
    {
      href: "/agents/financials",
      label: "Financials",
      icon: "chart",
      match: (p) => p.startsWith("/agents/financials"),
    },
    {
      href: "/agents/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/agents/settings"),
    },
  ];
}

function buyerHandlerNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/library", label: "Library", icon: "book", match: (p) => p.startsWith("/library") },
    {
      href: "/agents",
      label: "Clients",
      icon: "users",
      match: (p) =>
        (p === "/agents" || p.startsWith("/agents/farm/") || p.startsWith("/agents/buyer/")) &&
        !p.startsWith("/agents/settings"),
    },
    {
      href: "/agents/financials",
      label: "Financials",
      icon: "chart",
      match: (p) => p.startsWith("/agents/financials"),
    },
    {
      href: "/agents/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/agents/settings"),
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
      match: (p) =>
        (p === "/agents" || p.startsWith("/agents/farm/") || p.startsWith("/agents/buyer/")) &&
        !p.startsWith("/agents/settings"),
    },
    {
      href: "/agents/financials",
      label: "Financials",
      icon: "chart",
      match: (p) => p.startsWith("/agents/financials"),
    },
    {
      href: "/agents/settings",
      label: "Profile",
      icon: "user",
      match: (p) => p.startsWith("/agents/settings"),
    },
  ];
}

function adminNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/marketplace", label: "Market", icon: "store", match: (p) => p.startsWith("/marketplace") },
    { href: "/admin", label: "Admin", icon: "shield", match: (p) => p.startsWith("/admin") },
    { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
  ];
}

function accountantNav(): BottomNavItem[] {
  return [
    { href: "/accountant", label: "Overview", icon: "chart", match: (p) => p === "/accountant" },
    {
      href: "/accountant/transactions",
      label: "Access",
      icon: "credit-card",
      match: (p) => p.startsWith("/accountant/transactions"),
    },
    {
      href: "/accountant/withdrawals",
      label: "Order share",
      icon: "coins",
      match: (p) =>
        p.startsWith("/accountant/withdrawals") || p.startsWith("/accountant/receipts"),
    },
    { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
  ];
}

function staffGeneralNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/marketplace", label: "Market", icon: "store", match: (p) => p.startsWith("/marketplace") },
    { href: "/library", label: "Library", icon: "book", match: (p) => p.startsWith("/library") },
    { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
  ];
}

function pendingAccountantNav(): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Home", icon: "home", match: (p) => p === "/dashboard" },
    { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
  ];
}

function navForRole(roleId: number, verificationStatus?: string): BottomNavItem[] | null {
  if (isFarmer(roleId)) return farmerNav();
  if (isBuyer(roleId)) return buyerNav();
  if (isResearcher(roleId)) return researcherNav();
  if (isStudent(roleId)) return studentNav();
  if (isHandler(roleId)) {
    if (isFarmerHandler(roleId)) return farmerHandlerNav();
    if (isBuyerHandler(roleId)) return buyerHandlerNav();
    return handlerNav();
  }
  if (isAdmin(roleId)) return adminNav();
  if (isAccountant(roleId)) {
    return isAccountantApproved({ roleId, verificationStatus })
      ? accountantNav()
      : pendingAccountantNav();
  }
  if (isStaff(roleId)) return staffGeneralNav();
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

  const items = navForRole(user.roleId, user.verificationStatus);
  if (!items) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-brand-100/80 bg-white/95 shadow-[0_-4px_24px_rgba(27,67,50,0.08)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-3 py-1.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

/** Bottom padding for main content so it clears the fixed nav on mobile */
export const MOBILE_BOTTOM_NAV_PADDING = "pb-[calc(4.25rem+var(--mobile-bottom-nav-safe-area))] lg:pb-0";
