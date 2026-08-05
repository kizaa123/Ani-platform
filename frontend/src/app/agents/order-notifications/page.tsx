"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { HandlerOrderNotificationsPanel } from "@/components/HandlerOrderNotificationsPanel";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";
import { Icon } from "@/components/icons";
import { isFarmerHandler, isHandler } from "@/lib/types";

export default function HandlerOrderNotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isHandler(user.roleId)) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <PageContentSkeleton maxWidth="max-w-6xl" />;
  }

  const isFlo = isFarmerHandler(user.roleId);
  const entityLabel = isFlo ? "fellows" : "clients";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <Icon name="chevron-left" className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-900">Order Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Order updates for your assigned {entityLabel}.
        </p>
      </div>

      <HandlerOrderNotificationsPanel entityLabel={entityLabel} />
    </div>
  );
}
