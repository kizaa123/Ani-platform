"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { AgentAssignment, isFarmerAssignment, isBuyerAssignment, isHandler, isBuyerHandler, isFarmerHandler } from "@/lib/types";
import {
  HandlerFarmerClientCard,
  HandlerBuyerClientCard,
} from "@/components/HandlerAssignmentCards";

export default function AgentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.agents
        .assignments()
        .then(setAssignments)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load clients"));
    }
  }, [user?.id, loading, router]);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  const farmerClients = assignments.filter(isFarmerAssignment);
  const buyerClients = assignments.filter(isBuyerAssignment);

  const isBuyerHandlerUser = isBuyerHandler(user.roleId);
  const isFarmerHandlerUser = isFarmerHandler(user.roleId);
  const visibleFarmerClients = isBuyerHandlerUser ? [] : farmerClients;
  const visibleBuyerClients = isFarmerHandlerUser ? [] : buyerClients;
  const visibleTotal = visibleFarmerClients.length + visibleBuyerClients.length;
  const pageTitle = isBuyerHandlerUser
    ? "Assigned Clients"
    : isFarmerHandlerUser
      ? "Assigned Fellows"
      : "My Clients";
  const pageSubtitle = isBuyerHandlerUser
    ? "Clients and researchers who assigned you as their liaison officer"
    : isFarmerHandlerUser
      ? "Fellows who assigned you as their liaison officer"
      : "Fellows and clients who assigned you as their liaison officer";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{pageSubtitle}</p>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {assignments.length > 0 && visibleTotal > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            label={isBuyerHandlerUser ? "Assigned clients" : isFarmerHandlerUser ? "Assigned fellows" : "Total clients"}
            value={visibleTotal}
          />
          {!isBuyerHandlerUser && (
            <StatCard label="Fellows" value={visibleFarmerClients.length} accent="brand" />
          )}
          {!isFarmerHandlerUser && (
            <StatCard label="Clients" value={visibleBuyerClients.length} accent="muted" />
          )}
        </div>
      )}

      {visibleTotal === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/30 p-10 text-center">
          <p className="text-3xl">👥</p>
          <p className="mt-2 font-semibold text-brand-900">
            {isBuyerHandlerUser ? "No clients yet" : isFarmerHandlerUser ? "No fellows yet" : "No clients yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {isBuyerHandlerUser
              ? "Clients and researchers choose you as their liaison officer when they register on the platform."
              : isFarmerHandlerUser
                ? "Fellows choose you as their liaison officer when they register on the platform."
                : "Clients choose you as their handler when they register on the platform."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleFarmerClients.length > 0 && (
            <section>
              <SectionHeader
                title="Fellow clients"
                subtitle="View profiles and manage client orders"
                count={visibleFarmerClients.length}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleFarmerClients.map((a) => (
                  <HandlerFarmerClientCard key={a.id} assignment={a} />
                ))}
              </div>
            </section>
          )}

          {visibleBuyerClients.length > 0 && (
            <section>
              <SectionHeader
                title="Assigned clients"
                subtitle="View profiles and track orders placed"
                count={visibleBuyerClients.length}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleBuyerClients.map((a) => (
                  <HandlerBuyerClientCard key={a.id} assignment={a} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: number;
  accent?: "default" | "brand" | "muted";
}) {
  const bg =
    accent === "brand"
      ? "bg-brand-50 border-brand-100"
      : accent === "muted"
        ? "bg-gray-50 border-gray-100"
        : "bg-white border-brand-100";

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${bg}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-brand-900">{value}</p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-brand-100 pb-2.5">
      <div>
        <h2 className="text-lg font-bold text-brand-900">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-semibold text-brand-900">
        {count} assigned
      </span>
    </div>
  );
}
