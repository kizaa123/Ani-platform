"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isHandler } from "@/lib/types";

/** Liaison officers cannot view client connections — redirect to orders */
export default function HandlerClientBuyerConnectionsRedirectPage() {
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
    if (ownerId) router.replace(`/agents/buyer/${ownerId}/orders`);
  }, [user?.id, loading, router, ownerId]);

  return <div className="p-12 text-center text-gray-500">Loading...</div>;
}
