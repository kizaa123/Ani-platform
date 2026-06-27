"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { BuyerOrderLineItem, isHandler } from "@/lib/types";
import { ProductOrdersList } from "@/components/ProductOrdersList";
import { HandlerBuyerClientNav } from "@/components/HandlerBuyerClientNav";
import { formatGhc } from "@/lib/format";

export default function HandlerClientBuyerOrdersPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<BuyerOrderLineItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user && ownerId) {
      Promise.all([api.agents.clientOrders(ownerId), api.agents.clientFarm(ownerId)])
        .then(([orderData, client]) => {
          setOrders(orderData as BuyerOrderLineItem[]);
          if (client.clientType === "buyer" && client.buyer) {
            setBuyerName(client.buyer.name);
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load orders"));
    }
  }, [user?.id, loading, router, ownerId]);

  const paidTotal = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <HandlerBuyerClientNav ownerId={ownerId} buyerName={buyerName} />
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <HandlerBuyerClientNav ownerId={ownerId} buyerName={buyerName} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Orders placed</h1>
        <p className="text-gray-500">
          Every product order your buyer placed on the marketplace — read-only view
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total orders</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Paid</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {orders.filter((o) => o.status === "PAID").length}
          </p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Product spend</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{formatGhc(paidTotal)}</p>
        </div>
      </div>

      <ProductOrdersList
        perspective="buyer"
        orders={orders}
        emptyMessage="This buyer has not placed any orders yet."
      />
    </div>
  );
}
