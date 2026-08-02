"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy handler portal entry — clients live at /agents/clients */
export default function AgentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/agents/clients");
  }, [router]);

  return <div className="p-12 text-center text-gray-500">Loading...</div>;
}
