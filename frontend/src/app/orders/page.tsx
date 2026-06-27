"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { BuyerOrderLineItem, isBuyer } from "@/lib/types";
import { ProductOrdersList } from "@/components/ProductOrdersList";
import { formatGhc } from "@/lib/format";

export default function BuyerOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<BuyerOrderLineItem[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isBuyer(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.buyer
        .orders()
        .then((data) => {
          setOrders(data);
          setLoaded(true);
        })
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
        <p className="mt-3 text-sm text-gray-500">
          If this says &quot;Route not found&quot;, restart the backend server so the buyer API routes load.
        </p>
      </div>
    );
  }

  if (!loaded) {
    return <div className="p-12 text-center text-gray-500">Loading orders...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">My Orders</h1>
        <p className="text-gray-500">Products you ordered from farmers on the marketplace</p>
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
          <p className="text-xs font-semibold uppercase text-gray-500">Total product spend</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{formatGhc(paidTotal)}</p>
          <Link href="/financials" className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline">
            View financial statement →
          </Link>
        </div>
      </div>

      <ProductOrdersList
        perspective="buyer"
        orders={orders}
        emptyMessage="No orders yet."
        emptyAction={
          <Link href="/marketplace" className="font-semibold text-brand-700 underline">
            Browse the marketplace
          </Link>
        }
      />
    </div>
  );
}
