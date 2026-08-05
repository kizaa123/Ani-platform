"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy handler clients directory — removed from liaison officer portals */
export default function AgentClientsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <div className="p-12 text-center text-gray-500">Loading...</div>;
}
