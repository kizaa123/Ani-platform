"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { ProductOrderLineItem, isHandler } from "@/lib/types";
import { ProductOrdersList } from "@/components/ProductOrdersList";
import { HandlerClientNav } from "@/components/HandlerClientNav";

export default function HandlerClientOrdersPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<ProductOrderLineItem[]>([]);
  const [farmName, setFarmName] = useState("");
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
          setOrders(orderData);
          if (client.clientType === "farmer" && client.farmer) {
            setFarmName(client.farmer.farmName ?? client.farmer.name);
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load orders"));
    }
  }, [user?.id, loading, router, ownerId]);

  const servedCount = useMemo(
    () => orders.filter((o) => o.trackStage === "DELIVERED" || o.escrowStatus === "RELEASED").length,
    [orders]
  );
  const unservedCount = useMemo(
    () => orders.filter((o) => o.trackStage !== "DELIVERED" && o.escrowStatus !== "RELEASED").length,
    [orders]
  );

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <HandlerClientNav ownerId={ownerId} farmName={farmName || undefined} />
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <HandlerClientNav ownerId={ownerId} farmName={farmName || undefined} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total orders</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total served</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{servedCount}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total unserved</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{unservedCount}</p>
        </div>
      </div>

      <ProductOrdersList
        orders={orders}
        trackEditable
        handlerOwnerId={ownerId}
        emptyMessage="No buyer orders for this farmer yet."
      />
    </div>
  );
}
