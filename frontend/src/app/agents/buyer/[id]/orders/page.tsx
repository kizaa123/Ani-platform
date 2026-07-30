"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { BuyerOrderLineItem, isHandler } from "@/lib/types";
import { ProductOrdersList } from "@/components/ProductOrdersList";
import { HandlerBuyerClientNav } from "@/components/HandlerBuyerClientNav";

export default function HandlerClientBuyerOrdersPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<BuyerOrderLineItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [clientPhone, setClientPhone] = useState<string | null>(null);
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
          setOrders(orderData as unknown as BuyerOrderLineItem[]);
          if (client.clientType === "buyer" && client.buyer) {
            setBuyerName(client.buyer.name);
            setClientPhone(client.buyer.phone ?? null);
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
        <HandlerBuyerClientNav ownerId={ownerId} buyerName={buyerName} phone={clientPhone} />
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <HandlerBuyerClientNav ownerId={ownerId} buyerName={buyerName} phone={clientPhone} />
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
        perspective="buyer"
        orders={orders}
        handlerOwnerId={ownerId}
        emptyMessage="This buyer has not placed any orders yet."
      />
    </div>
  );
}
