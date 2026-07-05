"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { fullName, type UserProfile } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { Icon, type IconName } from "@/components/icons";

export type PortalNavLink = {
  href: string;
  label: string;
  icon: IconName;
  match: (pathname: string) => boolean;
};

type PortalSidebarLayoutProps = {
  children: React.ReactNode;
  navLinks: PortalNavLink[];
  portalTitle: string;
  getSubtitle?: (user: UserProfile) => string;
  defaultMobileTitle?: string;
};

function SidebarContent({
  navLinks,
  portalTitle,
  getSubtitle,
  onNavigate,
  showNotificationBell = false,
}: {
  navLinks: PortalNavLink[];
  portalTitle: string;
  getSubtitle?: (user: UserProfile) => string;
  onNavigate?: () => void;
  showNotificationBell?: boolean;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const photoCacheBust = user.updatedAt ? new Date(user.updatedAt).getTime() : undefined;
  const subtitle = getSubtitle?.(user) ?? user.role;

  return (
    <>
      <div className="flex items-center justify-between border-b border-brand-100 p-5">
        <div>
          <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2 text-lg font-bold text-brand-900">
            <Icon name="wheat" className="h-5 w-5 text-brand-700" />
            ANI Exchange
          </Link>
          <p className="mt-1 text-xs text-brand-600">{portalTitle}</p>
        </div>
        {showNotificationBell && <NotificationBell />}
      </div>

      <div className="flex items-center gap-3 border-b border-brand-100 px-5 py-4">
        <ProfilePhoto
          src={user.profilePicture}
          name={user.firstName}
          size={52}
          cacheBust={photoCacheBust}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-brand-900">{fullName(user)}</p>
          <p className="truncate text-xs text-brand-500">{subtitle}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navLinks.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-brand-100 text-brand-900"
                  : "text-gray-600 hover:bg-brand-50 hover:text-brand-800"
              }`}
            >
              <Icon name={link.icon} className="h-5 w-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-brand-100 p-3">
        <button
          type="button"
          onClick={async () => {
            onNavigate?.();
            await logout();
            router.push("/login");
          }}
          className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Logout
        </button>
      </div>
    </>
  );
}

function PortalMobileBar({
  navLinks,
  portalTitle,
  getSubtitle,
  defaultMobileTitle,
  onOpen,
}: {
  navLinks: PortalNavLink[];
  portalTitle: string;
  getSubtitle?: (user: UserProfile) => string;
  defaultMobileTitle?: string;
  onOpen: () => void;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentPage =
    navLinks.find((link) => link.match(pathname))?.label ?? defaultMobileTitle ?? portalTitle;
  const photoCacheBust = user?.updatedAt ? new Date(user.updatedAt).getTime() : undefined;
  const subtitle = user ? (getSubtitle?.(user) ?? user.role) : portalTitle;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-brand-200 bg-white px-4 py-3 shadow-sm lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 text-brand-800 hover:bg-brand-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-brand-900">{currentPage}</p>
        <p className="truncate text-xs text-brand-600">{subtitle}</p>
      </div>
      {user && (
        <>
          <NotificationBell />
          <ProfilePhoto
            src={user.profilePicture}
            name={user.firstName}
            size={44}
            cacheBust={photoCacheBust}
          />
        </>
      )}
    </header>
  );
}

export function PortalSidebarLayout({
  children,
  navLinks,
  portalTitle,
  getSubtitle,
  defaultMobileTitle,
}: PortalSidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
      <PortalMobileBar
        navLinks={navLinks}
        portalTitle={portalTitle}
        getSubtitle={getSubtitle}
        defaultMobileTitle={defaultMobileTitle}
        onOpen={() => setMobileOpen(true)}
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-brand-200 bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-end border-b border-brand-100 px-3 py-2">
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent
          navLinks={navLinks}
          portalTitle={portalTitle}
          getSubtitle={getSubtitle}
          onNavigate={closeMobile}
        />
      </aside>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-brand-200 bg-white shadow-sm lg:flex">
        <SidebarContent
          navLinks={navLinks}
          portalTitle={portalTitle}
          getSubtitle={getSubtitle}
          showNotificationBell
        />
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-brand-50/30">
        {children}
      </main>
    </div>
  );
}
