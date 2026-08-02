"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { isHandler } from "@/lib/types";

/** Liaison officers cannot access farm product management - redirect to orders. */
export default function HandlerClientFarmPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user && !isHandler(user.roleId)) {
      router.replace("/dashboard");
      return;
    }
    if (user && ownerId) {
      router.replace(`/agents/farm/${ownerId}/orders`);
    }
  }, [user?.id, loading, router, ownerId]);

  return <div className="p-12 text-center text-gray-500">Loading...</div>;
}
