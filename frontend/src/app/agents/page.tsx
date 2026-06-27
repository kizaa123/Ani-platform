"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { AgentAssignment, fullName, isFarmer, isHandler, isBuyerHandler, isFarmerHandler } from "@/lib/types";
import { FarmerAvatar } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";

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

  const farmerClients = assignments.filter(
    (a) => a.owner.isFarmer || isFarmer(a.owner.roleId ?? 0)
  );
  const buyerClients = assignments.filter(
    (a) => !(a.owner.isFarmer || isFarmer(a.owner.roleId ?? 0))
  );

  const isBuyerHandlerUser = isBuyerHandler(user.roleId);
  const isFarmerHandlerUser = isFarmerHandler(user.roleId);
  const visibleFarmerClients = isBuyerHandlerUser ? [] : farmerClients;
  const visibleBuyerClients = isFarmerHandlerUser ? [] : buyerClients;
  const visibleTotal = visibleFarmerClients.length + visibleBuyerClients.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">My Clients</h1>
        <p className="mt-1 text-gray-500">
          {isBuyerHandlerUser
            ? "Buyers who assigned you as their handler — view their full activity"
            : isFarmerHandlerUser
              ? "Farmers who assigned you as their handler"
              : "Farmers and buyers who assigned you as their handler"}
        </p>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {assignments.length > 0 && visibleTotal > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total clients" value={visibleTotal} />
          {!isBuyerHandlerUser && (
            <StatCard label="Farmers" value={visibleFarmerClients.length} accent="brand" />
          )}
          {!isFarmerHandlerUser && (
            <StatCard label="Buyers" value={visibleBuyerClients.length} accent="muted" />
          )}
        </div>
      )}

      {visibleTotal === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 p-12 text-center">
          <p className="text-4xl">👥</p>
          <p className="mt-3 font-semibold text-brand-900">No clients yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Clients choose you as their handler when they register on the platform.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {visibleFarmerClients.length > 0 && (
            <section>
              <SectionHeader
                title="Farmer clients"
                subtitle="View profiles and access their farms to support them"
                count={visibleFarmerClients.length}
              />
              <div className="grid gap-6 md:grid-cols-2">
                {visibleFarmerClients.map((a) => (
                  <FarmerClientCard key={a.id} assignment={a} />
                ))}
              </div>
            </section>
          )}

          {visibleBuyerClients.length > 0 && (
            <section>
              <SectionHeader
                title="Buyer clients"
                subtitle="Full transparency into orders, spending, and farmer connections"
                count={visibleBuyerClients.length}
              />
              <div className="grid gap-6 md:grid-cols-2">
                {visibleBuyerClients.map((a) => (
                  <BuyerClientCard key={a.id} assignment={a} />
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
    <div className={`rounded-xl border p-4 shadow-sm ${bg}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-brand-900">{value}</p>
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-brand-100 pb-3">
      <div>
        <h2 className="text-xl font-bold text-brand-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900">
        {count} assigned
      </span>
    </div>
  );
}

function FarmerClientCard({ assignment }: { assignment: AgentAssignment }) {
  const { owner } = assignment;
  const farmName = owner.farmerProfile?.farmName ?? "Farm";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-brand-50 bg-gradient-to-br from-brand-50/80 to-white p-5">
        <div className="flex items-start gap-4">
          <FarmerAvatar
            src={owner.profilePicture}
            name={owner.firstName}
            size="lg"
            cacheBust={owner.updatedAt ? new Date(owner.updatedAt).getTime() : undefined}
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-brand-900 leading-tight">{fullName(owner)}</p>
            <p className="mt-0.5 font-medium text-brand-700">{farmName}</p>
            <CountryBadge country={owner.country} region={owner.region} className="mt-2" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailBox label="Phone" highlight>
            <a href={`tel:${owner.phone}`} className="font-semibold text-brand-800 hover:underline">
              {owner.phone}
            </a>
          </DetailBox>
          <DetailBox label="Email">
            <span className="break-all text-gray-800">{owner.email}</span>
          </DetailBox>
          {owner.city && (
            <DetailBox label="City">
              <span className="text-gray-800">{owner.city}</span>
            </DetailBox>
          )}
          {owner.farmerProfile?.farmSize && (
            <DetailBox label="Farm size">
              <span className="font-medium text-brand-900">{owner.farmerProfile.farmSize}</span>
            </DetailBox>
          )}
        </div>

        {(owner.commodities?.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Commodities
            </p>
            <div className="flex flex-wrap gap-1.5">
              {owner.commodities!.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto space-y-2 pt-5">
          <Link
            href={`/agents/farm/${owner.id}`}
            className="btn-gold flex w-full items-center justify-center gap-2 py-3"
          >
            Access Farm
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/agents/farm/${owner.id}/orders`}
              className="btn-outline py-2.5 text-center text-xs"
            >
              Buyer orders
            </Link>
            <Link
              href={`/agents/farm/${owner.id}/financials`}
              className="btn-outline py-2.5 text-center text-xs"
            >
              Financials
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function BuyerClientCard({ assignment }: { assignment: AgentAssignment }) {
  const { owner } = assignment;
  const displayName = fullName(owner);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-brand-50 bg-gradient-to-br from-brand-50/80 to-white p-5">
        <div className="flex items-start gap-4">
          <FarmerAvatar
            src={owner.profilePicture}
            name={owner.firstName}
            size="lg"
            cacheBust={owner.updatedAt ? new Date(owner.updatedAt).getTime() : undefined}
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-brand-900 leading-tight">{displayName}</p>
            {owner.buyerProfile?.company && (
              <p className="mt-0.5 font-medium text-brand-700">{owner.buyerProfile.company}</p>
            )}
            <CountryBadge country={owner.country} region={owner.region} className="mt-2" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailBox label="Phone" highlight>
            <a href={`tel:${owner.phone}`} className="font-semibold text-brand-800 hover:underline">
              {owner.phone}
            </a>
          </DetailBox>
          <DetailBox label="Email">
            <span className="break-all text-gray-800">{owner.email}</span>
          </DetailBox>
          {owner.city && (
            <DetailBox label="City">
              <span className="text-gray-800">{owner.city}</span>
            </DetailBox>
          )}
        </div>

        <div className="mt-auto space-y-2 pt-5">
          <Link
            href={`/agents/buyer/${owner.id}/orders`}
            className="btn-gold flex w-full items-center justify-center gap-2 py-3"
          >
            View Buyer Activity
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/agents/buyer/${owner.id}/orders`}
              className="btn-outline py-2.5 text-center text-xs"
            >
              Orders
            </Link>
            <Link
              href={`/agents/buyer/${owner.id}/financials`}
              className="btn-outline py-2.5 text-center text-xs"
            >
              Financials
            </Link>
          </div>
          <Link
            href={`/agents/buyer/${owner.id}/connections`}
            className="btn-outline block py-2.5 text-center text-xs"
          >
            Farmer connections
          </Link>
        </div>
      </div>
    </article>
  );
}

function DetailBox({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 text-sm ${
        highlight ? "border border-brand-100 bg-brand-50/50" : "bg-gray-50"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
