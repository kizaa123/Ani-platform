"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [filterTab, setFilterTab] = useState<"ALL" | "UNSERVED" | "SERVED">("ALL");
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

  const paidTotal = useMemo(
    () =>
      orders
        .filter((o) => o.status === "PAID")
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [orders]
  );

  const servedOrders = useMemo(
    () => orders.filter((o) => o.trackStage === "DELIVERED" || o.escrowStatus === "RELEASED"),
    [orders]
  );

  const unservedOrders = useMemo(
    () => orders.filter((o) => o.trackStage !== "DELIVERED" && o.escrowStatus !== "RELEASED"),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (filterTab === "SERVED") return servedOrders;
    if (filterTab === "UNSERVED") return unservedOrders;
    return orders;
  }, [filterTab, orders, servedOrders, unservedOrders]);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading orders...</div>;
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
        <Link href="/farm" className="text-sm font-medium text-brand-600 hover:underline">
          &larr; Back to My Farm
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Buyer Orders</h1>
        <p className="text-gray-500">
          Products buyers ordered from your farm — manage fulfillment, track deliveries, and view contact details.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase text-gray-500">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{orders.length}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-amber-800">Unserved</p>
            <span className="text-xs">⏳</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-900">{unservedOrders.length}</p>
          <p className="mt-1 text-[11px] text-amber-700">Fulfillment pending</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-emerald-800">Served</p>
            <span className="text-xs">✅</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{servedOrders.length}</p>
          <p className="mt-1 text-[11px] text-emerald-700">Delivered &amp; completed</p>
        </div>

        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase text-gray-500">Revenue Received</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{formatGhc(paidTotal)}</p>
          <Link
            href="/farm/financials"
            className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline"
          >
            Financial statement &rarr;
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-brand-100 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilterTab("ALL")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            filterTab === "ALL"
              ? "bg-brand-800 text-white shadow-xs"
              : "bg-white text-gray-600 border border-brand-200 hover:bg-brand-50"
          }`}
        >
          All Orders ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("UNSERVED")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            filterTab === "UNSERVED"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
          }`}
        >
          ⏳ Unserved Orders ({unservedOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("SERVED")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            filterTab === "SERVED"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
          }`}
        >
          ✅ Served Orders ({servedOrders.length})
        </button>
      </div>

      <ProductOrdersList
        orders={filteredOrders}
        trackEditable
        emptyMessage={
          filterTab === "UNSERVED"
            ? "No unserved orders. All orders have been delivered!"
            : filterTab === "SERVED"
              ? "No served orders yet. Delivered orders will appear here."
              : "No buyer orders yet. When buyers purchase from your farm listings, orders will appear here."
        }
        emptyAction={
          <Link href="/farm" className="font-semibold text-brand-700 underline">
            Manage your farm products
          </Link>
        }
      />
    </div>
  );
}
