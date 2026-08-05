"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { AgentAssignment, isFarmerAssignment, isFarmerHandler, isHandler } from "@/lib/types";
import { HandlerFarmerClientCard } from "@/components/HandlerAssignmentCards";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";
import { Icon } from "@/components/icons";

export default function AssignedFellowsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<AgentAssignment[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!isFarmerHandler(user.roleId)) {
      router.replace("/agents/clients");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isFarmerHandler(user.roleId)) return;

    let cancelled = false;
    api.agents
      .assignments()
      .then((list) => {
        if (!cancelled) {
          setAssignments(list.filter(isFarmerAssignment));
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setAssignments([]);
          setError(e instanceof Error ? e.message : "Failed to load assigned fellows");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return <PageContentSkeleton maxWidth="max-w-6xl" />;
  }

  const fellows = assignments ?? [];
  const loadingList = assignments === null;

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
        <h1 className="text-3xl font-bold text-brand-900">Assigned Fellows</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fellows who assigned you as their liaison officer — view profiles and support their orders.
        </p>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      {loadingList ? (
        <PageContentSkeleton maxWidth="max-w-6xl" />
      ) : fellows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/30 p-10 text-center">
          <p className="text-3xl">👥</p>
          <p className="mt-2 font-semibold text-brand-900">No fellows assigned yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Fellows choose you as their liaison officer when they register on the platform.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-gray-500">
            {fellows.length} fellow{fellows.length !== 1 ? "s" : ""} assigned
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fellows.map((assignment) => (
              <HandlerFarmerClientCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
