"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  FarmClient,
  fullName,
  isHandler,
  isFarmer,
  isBuyer,
  isResearcher,
  ROLES,
} from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";

type RoleFilter = "all" | "fellows" | "clients" | "flo" | "clo" | "researchers";

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fellows", label: "Fellows" },
  { value: "clients", label: "Clients" },
  { value: "flo", label: "FLO" },
  { value: "clo", label: "CLO" },
  { value: "researchers", label: "Researchers" },
];

function formatLocation(client: FarmClient): string {
  return [client.city, client.region, client.country].filter(Boolean).join(", ");
}

function matchesRoleFilter(client: FarmClient, filter: RoleFilter): boolean {
  if (filter === "all") return true;
  if (filter === "fellows") return isFarmer(client.roleId);
  if (filter === "clients") return isBuyer(client.roleId) || client.roleId === ROLES.STUDENT;
  if (filter === "flo") return client.roleId === ROLES.FARMER_HANDLER;
  if (filter === "clo") return client.roleId === ROLES.BUYER_HANDLER;
  if (filter === "researchers") return isResearcher(client.roleId);
  return true;
}

function ClientCard({ client }: { client: FarmClient }) {
  const location = formatLocation(client);

  return (
    <div className="flex w-full rounded-xl border border-brand-100 bg-white p-3 text-left shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <AvatarWithVerification
          src={client.profilePicture}
          name={client.firstName}
          size={72}
          verificationStatus={client.verificationStatus}
          verificationTags={client.verificationTags}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-brand-900">
            {fullName(client)}
          </p>
          <p className="mt-0.5 truncate text-xs text-brand-700">{client.roleLabel}</p>
          {location && (
            <p className="mt-0.5 truncate text-xs text-gray-500">{location}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<FarmClient[] | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

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

  useEffect(() => {
    if (!user || !isHandler(user.roleId)) return;

    let cancelled = false;
    api.agents
      .clients()
      .then((list) => {
        if (!cancelled) setClients(list);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e);
          setClients([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadingClients = clients === null;

  const filtered = useMemo(() => {
    const list = clients ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((c) => {
      if (!matchesRoleFilter(c, roleFilter)) return false;
      if (!term) return true;
      const haystack = [
        fullName(c),
        c.roleLabel,
        c.city,
        c.region,
        c.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, search, roleFilter]);

  if (loading || !user) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-brand-900">Clients</h1>
      <p className="mb-6 text-sm text-gray-500">
        All fellows, clients, liaison officers, and researchers on the platform.
      </p>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, role, or location..."
          className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {ROLE_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRoleFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              roleFilter === value
                ? "bg-brand-800 text-white"
                : "bg-brand-50 text-brand-800 hover:bg-brand-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loadingClients ? (
        <PageContentSkeleton />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-200 px-4 py-12 text-center text-sm text-gray-500">
          {search.trim() || roleFilter !== "all"
            ? "No users match your search or filter."
            : "No users registered yet."}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
