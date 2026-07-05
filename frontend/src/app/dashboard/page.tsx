"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { isFarmer, isBuyer, isHandler, isStaff, isBuyerHandler } from "@/lib/types";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user?.id, loading, router]);

  if (loading || !user) return <div className="p-12 text-center text-gray-500">Loading...</div>;

  const cards = [
    { href: "/marketplace", title: "Marketplace", desc: "Browse commodity listings", icon: "🏪", all: true },
    { href: "/farm", title: "My Farm", desc: "Manage products & profile", icon: "🌾", show: isFarmer(user.roleId) },
    { href: "/farm/financials", title: "Financial Statement", desc: "View farm product finances", icon: "📊", show: isFarmer(user.roleId) },
    { href: "/access", title: "Buyer Access", desc: "Pay to access farmer farms", icon: "💳", show: isBuyer(user.roleId) },
    { href: "/financials", title: "Financial Statement", desc: "Spending & farm access fees", icon: "📊", show: isBuyer(user.roleId) },
    { href: "/orders", title: "My Orders", desc: "Products ordered from farmers", icon: "📦", show: isBuyer(user.roleId) },
    { href: "/connections", title: "Connections", desc: "Manage buyer-farmer requests", icon: "🤝", all: true },
    { href: "/agents", title: isBuyerHandler(user.roleId) ? "My Buyers" : "My Clients", desc: isBuyerHandler(user.roleId) ? "View orders, spending & connections" : "View assigned farmers/buyers", icon: "👥", show: isHandler(user.roleId) },
    { href: "/admin", title: "Admin Panel", desc: "Verification & payments", icon: "⚙️", show: isStaff(user.roleId) },
    { href: "/farm/settings", title: "Profile", desc: "Profile, handler, farm & commodities", icon: "👤", show: isFarmer(user.roleId) },
    { href: "/settings", title: "Profile", desc: "Profile, location & handler", icon: "👤", show: isBuyer(user.roleId) },
    { href: "/agents/settings", title: "Profile", desc: "Profile photo & contact details", icon: "👤", show: isHandler(user.roleId) },
    { href: "/profile", title: "Profile", desc: "Your account settings", icon: "👤", show: isStaff(user.roleId) },
  ].filter((c) => c.all || c.show);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">Welcome, {user.firstName}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}
            className="group rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
            <div className="text-3xl mb-3">{c.icon}</div>
            <h3 className="font-bold text-brand-900 group-hover:text-brand-700">{c.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
