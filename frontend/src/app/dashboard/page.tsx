"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { isFarmer, isBuyer, isHandler, isStaff, isBuyerHandler } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user?.id, loading, router]);

  if (loading || !user) return <div className="p-12 text-center text-gray-500">Loading...</div>;

  const photoCacheBust = user.updatedAt
    ? new Date(user.updatedAt).getTime()
    : user.profilePicture
      ? 1
      : 0;

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
    { href: "/farm/settings", title: "Settings", desc: "Profile, handler, farm & commodities", icon: "⚙️", show: isFarmer(user.roleId) },
    { href: "/settings", title: "Settings", desc: "Profile, location & handler", icon: "⚙️", show: isBuyer(user.roleId) },
    { href: "/agents/settings", title: "Settings", desc: "Profile photo & contact details", icon: "⚙️", show: isHandler(user.roleId) },
    { href: "/profile", title: "Profile", desc: "Your account settings", icon: "👤", show: isStaff(user.roleId) },
  ].filter((c) => c.all || c.show);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <ProfilePhoto
          src={user.profilePicture}
          name={user.firstName}
          size={96}
          cacheBust={photoCacheBust}
        />
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-brand-900">Welcome, {user.firstName}</h1>
          <p className="text-gray-500">{user.role}</p>
          <CountryBadge country={user.country} region={user.region} className="mt-1 justify-center sm:justify-start" />
          {isFarmer(user.roleId) && user.farmerProfile && (
            <p className="text-sm text-brand-700">{user.farmerProfile.farmName}</p>
          )}
          {(isFarmer(user.roleId) || isBuyer(user.roleId)) && user.assignedHandler && (
            <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
              <ProfilePhoto
                src={user.assignedHandler.profilePicture}
                name={user.assignedHandler.firstName}
                size={32}
                cacheBust={
                  user.assignedHandler.updatedAt
                    ? new Date(user.assignedHandler.updatedAt).getTime()
                    : undefined
                }
              />
              <p className="text-sm text-brand-700">
                Handler: {user.assignedHandler.firstName} {user.assignedHandler.lastName}
              </p>
            </div>
          )}
          {isHandler(user.roleId) && (
            <p className="mt-1 text-sm text-brand-700">
              {isBuyerHandler(user.roleId)
                ? "Buyer representative — full visibility into your clients"
                : "Farmer representative"}
            </p>
          )}
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            user.verificationStatus === "VERIFIED" ? "bg-brand-100 text-brand-900" : "bg-yellow-100 text-yellow-900"
          }`}>
            {user.verificationStatus}
          </span>
        </div>
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
