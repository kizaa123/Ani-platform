"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isFarmer, isBuyer, isHandler, isAdmin, isAccountant, isAccountantApproved, isAccountantAwaitingAccess, isBuyerHandler, isResearcher, isStudent, isFarmerHandler, canPurchaseFromMarketplace } from "@/lib/types";
import { AccountantPendingApproval } from "@/components/AccountantPendingApproval";
import { PortalNavCard, PortalNavCardSkeleton } from "@/components/PortalNavCard";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { getPortalNavImage } from "@/lib/portalNavImages";
import { FarmerHandlerDashboardCards, FarmerHandlerDashboardHint } from "@/components/FarmerHandlerDashboardCards";
import { BuyerHandlerDashboardCards, BuyerHandlerDashboardHint } from "@/components/BuyerHandlerDashboardCards";
import { HandlerPortalNavCards } from "@/components/HandlerPortalNavCards";
import type { IconName } from "@/components/icons";
import { AdSlot } from "@/components/AdSlot";

type DashboardCard = {
  href: string;
  title: string;
  desc: string;
  icon: IconName;
  all?: boolean;
  show?: boolean;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && isAccountant(user.roleId) && isAccountantApproved(user)) {
      router.replace("/accountant");
    }
  }, [user?.id, user?.verificationStatus, loading, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PortalNavCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isAccountant(user.roleId) && isAccountantApproved(user)) {
    return <PageContentSkeleton maxWidth="max-w-6xl" />;
  }

  const isFlo = isFarmerHandler(user.roleId);
  const isHandlerUser = isHandler(user.roleId);
  const isClo = isBuyerHandler(user.roleId);
  const isLiaison = isFlo || isClo;

  const cards = ([
    { href: "/marketplace", title: "Marketplace", desc: "Browse fellows & place orders", icon: "store", all: true, hideForLiaison: true },
    { href: "/library", title: "Research Library", desc: "Browse books & research publications", icon: "book", all: true },
    { href: "/researcher/publications", title: "My Publications", desc: "Upload & manage research files", icon: "book", show: isResearcher(user.roleId) },
    { href: "/researcher/settings", title: "Profile", desc: "Institution & researcher profile", icon: "user", show: isResearcher(user.roleId) },
    { href: "/farm", title: "My Production", desc: "Manage products & profile", icon: "sprout", show: isFarmer(user.roleId) },
    { href: "/farm/financials", title: "Financial Statement", desc: "View production finances", icon: "chart", show: isFarmer(user.roleId) },
    { href: "/farm/orders", title: "Client Orders", desc: "Track & manage orders placed by clients", icon: "package", show: isFarmer(user.roleId) },
    { href: "/farm/clients", title: "Clients", desc: "Notify clients & researchers when products are ready", icon: "users", show: isFarmer(user.roleId) },
    { href: "/researcher/clients", title: "Clients", desc: "Notify fellows & clients when publications are ready", icon: "users", show: isResearcher(user.roleId) },
    { href: "/financials", title: "Purchase Financials", desc: "Spending & production access fees", icon: "chart", show: canPurchaseFromMarketplace(user.roleId) },
    { href: "/orders", title: "My Order", desc: "Track marketplace purchases", icon: "package", show: canPurchaseFromMarketplace(user.roleId) },
    { href: "/student/settings", title: "Profile", desc: "Account & contact details", icon: "user", show: isStudent(user.roleId) },
    { href: "/connections", title: "Connections", desc: "Manage client-fellow requests", icon: "handshake", show: !isResearcher(user.roleId) && !isLiaison },
    { href: "/admin", title: "Admin Panel", desc: "Analytics, verification & moderation", icon: "shield", show: isAdmin(user.roleId) },
    { href: "/admin/staff", title: "ANI Team", desc: "Manage staff accounts & roles", icon: "users", show: isAdmin(user.roleId) },
    { href: "/admin/ads", title: "Internal Ads", desc: "Manage banner promotions", icon: "leaf", show: isAdmin(user.roleId) },
    { href: "/admin/financials", title: "Financial Statement", desc: "Platform-wide revenue (read-only)", icon: "chart", show: isAdmin(user.roleId) },
    { href: "/accountant", title: "Financial Overview", desc: "Access income, order share & balances", icon: "chart", show: isAccountant(user.roleId) && isAccountantApproved(user) },
    { href: "/accountant/transactions", title: "Access Ledger", desc: "Production & publication access payments", icon: "credit-card", show: isAccountant(user.roleId) && isAccountantApproved(user) },
    { href: "/accountant/withdrawals", title: "Order Shared & Withdrawals", desc: "Distribute orders & record withdrawals", icon: "coins", show: isAccountant(user.roleId) && isAccountantApproved(user) },
    { href: "/accountant/receipts", title: "Order Receipts", desc: "Released order statement PDFs", icon: "package", show: isAccountant(user.roleId) && isAccountantApproved(user) },
    { href: "/farm/settings", title: "Profile", desc: "Profile, liaison officer, production & commodities", icon: "user", show: isFarmer(user.roleId) },
    { href: "/settings", title: "Profile", desc: "Profile, location & liaison officer", icon: "user", show: isBuyer(user.roleId) },
    { href: "/profile", title: "Profile", desc: "Your account settings", icon: "user", show: isAdmin(user.roleId) || isAccountant(user.roleId) },
  ] satisfies (DashboardCard & { hideForLiaison?: boolean })[]).filter(
    (c) =>
      (c.all || c.show) &&
      !(isLiaison && c.hideForLiaison) &&
      !(isHandlerUser && (c.href === "/library" || c.href.startsWith("/agents")))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ScrollReveal trigger="mount" delay={0} duration={450} direction="fade-up" className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">Welcome, {user.firstName}</h1>
        {isFlo && <FarmerHandlerDashboardHint />}
        {isClo && <BuyerHandlerDashboardHint />}
      </ScrollReveal>

      <AdSlot placement="dashboard" className="mb-8" />

      {isAccountantAwaitingAccess(user) && (
        <div className="mb-8">
          <AccountantPendingApproval status={user.verificationStatus ?? "PENDING"} />
        </div>
      )}

      {!isAccountantAwaitingAccess(user) && (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isFlo && <FarmerHandlerDashboardCards />}
        {isClo && <BuyerHandlerDashboardCards />}
        {isHandlerUser && (
          <HandlerPortalNavCards
            roleId={user.roleId}
            startIndex={isLiaison ? 2 : 0}
          />
        )}
        {cards.map((c, i) => {
          const staggerIndex = isHandlerUser ? (isLiaison ? 2 : 0) + 4 + i : i;
          return (
            <ScrollReveal key={c.href} delay={scrollStagger(staggerIndex, 90)} duration={500} direction="fade-up">
              <PortalNavCard
                href={c.href}
                title={c.title}
                desc={c.desc}
                icon={c.icon}
                image={getPortalNavImage(c.href, user.roleId)}
              />
            </ScrollReveal>
          );
        })}
      </div>
      )}
    </div>
  );
}
