"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isFarmer, isBuyer, isHandler, isStaff, fullName } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { NotificationBell } from "@/components/NotificationBell";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/farm", label: "My Farm", farmer: true },
  { href: "/access", label: "Buyer Access", buyer: true },
  { href: "/financials", label: "Financials", buyer: true },
  { href: "/orders", label: "My Orders", buyer: true },
  { href: "/agents", label: "Clients", handler: true },
  { href: "/connections", label: "Connections" },
  { href: "/admin", label: "Admin", staff: true },
];

function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function NavLinks({
  links,
  pathname,
  profileHref,
  profileLabel,
  onNavigate,
  className = "",
  stacked = false,
}: {
  links: typeof NAV;
  pathname: string;
  profileHref: string;
  profileLabel: string;
  onNavigate?: () => void;
  className?: string;
  stacked?: boolean;
}) {
  const linkClass = (active: boolean) =>
    `${stacked ? "block w-full" : "whitespace-nowrap"} rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      active
        ? "bg-brand-100 text-brand-900"
        : "text-gray-600 hover:bg-brand-50 hover:text-brand-800"
    }`;

  const allLinks = [...links, { href: profileHref, label: profileLabel }];

  return (
    <nav className={className}>
      {allLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onNavigate}
          className={linkClass(pathname.startsWith(l.href))}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  if (loading || pathname === "/" || pathname === "/login" || pathname === "/register") {
    if (pathname === "/" || pathname === "/login" || pathname === "/register") {
      return (
        <header className="sticky top-0 z-50 border-b border-brand-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-xl font-bold text-brand-900">
              🌾 ANI Exchange
            </Link>
            <div className="flex gap-2 sm:gap-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 sm:px-4"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-900 sm:px-4"
              >
                Register
              </Link>
            </div>
          </div>
        </header>
      );
    }
    return null;
  }

  if (!user) return null;

  const links = NAV.filter((n) => {
    if (n.farmer && !isFarmer(user.roleId)) return false;
    if (n.buyer && !isBuyer(user.roleId)) return false;
    if (n.handler && !isHandler(user.roleId)) return false;
    if (n.staff && !isStaff(user.roleId)) return false;
    return true;
  });

  const profileHref = isBuyer(user.roleId) ? "/settings" : "/profile";
  const profileLabel = isBuyer(user.roleId) ? "Settings" : "Profile";
  const photoCacheBust = user.updatedAt ? new Date(user.updatedAt).getTime() : undefined;

  const handleLogout = async () => {
    closeMobile();
    await logout();
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-brand-200 bg-white shadow-sm">
        <div className="mx-auto hidden h-16 max-w-7xl items-center gap-6 px-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-8">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="shrink-0 text-lg font-bold tracking-tight text-brand-900 transition hover:text-brand-700"
          >
            🌾 ANI Exchange
          </Link>

          {/* Center nav */}
          <NavLinks
            links={links}
            pathname={pathname}
            profileHref={profileHref}
            profileLabel={profileLabel}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 xl:gap-x-6 xl:px-8"
          />

          {/* User actions */}
          <div className="flex shrink-0 items-center justify-end gap-3 pl-2">
            <NotificationBell />
            <div className="hidden h-8 w-px bg-brand-200 sm:block" aria-hidden />
            <Link
              href={profileHref}
              className="flex max-w-[12rem] items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-1.5 transition hover:border-brand-200 hover:bg-brand-50 sm:max-w-[14rem]"
            >
              <FarmerAvatar
                src={user.profilePicture}
                name={user.firstName}
                size="sm"
                cacheBust={photoCacheBust}
              />
              <div className="min-w-0 text-left leading-tight">
                <p className="truncate text-sm font-semibold text-brand-900">{fullName(user)}</p>
                <p className="truncate text-[11px] text-brand-500">{user.role}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-brand-200 px-3.5 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile bar */}
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 lg:hidden">
          <Link href="/dashboard" className="min-w-0 truncate text-base font-bold text-brand-900">
            🌾 ANI Exchange
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 text-brand-800 hover:bg-brand-50"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-l border-brand-200 bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
          <p className="text-sm font-bold text-brand-900">Menu</p>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-800"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-brand-100 px-4 py-4">
          <FarmerAvatar
            src={user.profilePicture}
            name={user.firstName}
            size="sm"
            cacheBust={photoCacheBust}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-900">{fullName(user)}</p>
            <p className="truncate text-xs text-brand-500">{user.role}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks
            links={links}
            pathname={pathname}
            profileHref={profileHref}
            profileLabel={profileLabel}
            onNavigate={closeMobile}
            stacked
            className="space-y-1"
          />
        </div>

        <div className="border-t border-brand-100 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
