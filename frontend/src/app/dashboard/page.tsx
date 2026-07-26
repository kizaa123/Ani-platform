"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isFarmer, isBuyer, isHandler, isStaff, isBuyerHandler, isResearcher } from "@/lib/types";
import { PortalNavCard } from "@/components/PortalNavCard";
import { getPortalNavImage } from "@/lib/portalNavImages";
import type { IconName } from "@/components/icons";

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
  }, [user?.id, loading, router]);

  if (loading || !user) return <div className="p-12 text-center text-gray-500">Loading...</div>;

  const cards = ([
    { href: "/marketplace", title: "Marketplace", desc: "Browse commodity listings", icon: "store", all: true },
    { href: "/library", title: "Research Library", desc: "Browse books & research publications", icon: "book", all: true },
    { href: "/researcher/publications", title: "My Publications", desc: "Upload & manage research files", icon: "book", show: isResearcher(user.roleId) },
    { href: "/researcher/financials", title: "Financial Statement", desc: "Earnings from publication sales", icon: "chart", show: isResearcher(user.roleId) },
    { href: "/researcher/settings", title: "Profile", desc: "Institution & researcher profile", icon: "user", show: isResearcher(user.roleId) },
    { href: "/farm", title: "My Farm", desc: "Manage products & profile", icon: "sprout", show: isFarmer(user.roleId) },
    { href: "/farm/financials", title: "Financial Statement", desc: "View farm product finances", icon: "chart", show: isFarmer(user.roleId) },
    { href: "/access", title: "Buyer Access", desc: "Pay to access farmer farms", icon: "credit-card", show: isBuyer(user.roleId) },
    { href: "/financials", title: "Financial Statement", desc: "Spending & farm access fees", icon: "chart", show: isBuyer(user.roleId) },
    { href: "/orders", title: "My Orders", desc: "Products ordered from farmers", icon: "package", show: isBuyer(user.roleId) },
    { href: "/connections", title: "Connections", desc: "Manage buyer-farmer requests", icon: "handshake", all: true },
    { href: "/agents", title: isBuyerHandler(user.roleId) ? "My Buyers" : "My Clients", desc: isBuyerHandler(user.roleId) ? "View orders, spending & connections" : "View assigned farmers/buyers", icon: "users", show: isHandler(user.roleId) },
    { href: "/admin", title: "Admin Panel", desc: "Verification & payments", icon: "shield", show: isStaff(user.roleId) },
    { href: "/farm/settings", title: "Profile", desc: "Profile, handler, farm & commodities", icon: "user", show: isFarmer(user.roleId) },
    { href: "/settings", title: "Profile", desc: "Profile, location & handler", icon: "user", show: isBuyer(user.roleId) },
    { href: "/agents/settings", title: "Profile", desc: "Profile photo & contact details", icon: "user", show: isHandler(user.roleId) },
    { href: "/profile", title: "Profile", desc: "Your account settings", icon: "user", show: isStaff(user.roleId) },
  ] satisfies DashboardCard[]).filter((c) => c.all || c.show);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">Welcome, {user.firstName}</h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <PortalNavCard
            key={c.href}
            href={c.href}
            title={c.title}
            desc={c.desc}
            icon={c.icon}
            image={getPortalNavImage(c.href)}
          />
        ))}
      </div>
    </div>
  );
}
