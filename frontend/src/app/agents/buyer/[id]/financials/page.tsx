"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isBuyerHandler, isHandler } from "@/lib/types";

/** Client liaison officers view commission at /agents/financials - not per-client buyer financials */
export default function HandlerClientBuyerFinancialsRedirectPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user && isBuyerHandler(user.roleId)) {
      router.replace("/agents/clients");
      return;
    }
    if (ownerId) router.replace(`/agents/buyer/${ownerId}/orders`);
  }, [user?.id, loading, router, ownerId]);

  return <div className="p-12 text-center text-gray-500">Loading...</div>;
}
