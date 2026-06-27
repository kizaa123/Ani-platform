"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Profile overview merged into orders/connections — redirect legacy URL */
export default function HandlerClientBuyerRedirectPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const router = useRouter();

  useEffect(() => {
    if (ownerId) router.replace(`/agents/buyer/${ownerId}/orders`);
  }, [ownerId, router]);

  return <div className="p-12 text-center text-gray-500">Loading...</div>;
}
