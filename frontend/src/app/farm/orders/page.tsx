"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { ProductOrderLineItem, ROLES } from "@/lib/types";
import { ProductOrdersList } from "@/components/ProductOrdersList";
import { formatGhc } from "@/lib/format";

export default function FarmerOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<ProductOrderLineItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (
      user &&
      ![ROLES.CROP_FARMER, ROLES.LIVESTOCK_FARMER].includes(user.roleId as 1 | 2)
    ) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.farm
        .orders()
        .then(setOrders)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load orders"));
    }
  }, [user?.id, loading, router]);

  const paidTotal = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Link href="/farm" className="text-sm text-brand-600 hover:underline">
          ← Back to My Farm
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Buyer Orders</h1>
        <p className="text-gray-500">
          Products buyers ordered from your farm — with contact details
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total orders</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Paid orders</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {orders.filter((o) => o.status === "PAID").length}
          </p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Revenue received</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{formatGhc(paidTotal)}</p>
          <Link
            href="/farm/financials"
            className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline"
          >
            View financial statement →
          </Link>
        </div>
      </div>

      <ProductOrdersList
        orders={orders}
        trackEditable
        emptyMessage="No buyer orders yet. When buyers purchase from your farm listings, orders will appear here."
        emptyAction={
          <Link href="/farm" className="font-semibold text-brand-700 underline">
            Manage your farm products
          </Link>
        }
      />
    </div>
  );
}
