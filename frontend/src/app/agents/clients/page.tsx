"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FarmClient, fullName, isHandler } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { NotifyClientModal } from "@/components/NotifyClientModal";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";

function formatLocation(client: FarmClient): string {
  return [client.city, client.region, client.country].filter(Boolean).join(", ");
}

function ClientCard({ client, onNotify }: { client: FarmClient; onNotify: () => void }) {
  const location = formatLocation(client);
  const subtitle = location || client.roleLabel;

  return (
    <button
      type="button"
      onClick={onNotify}
      className="flex w-full rounded-xl border border-brand-100 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
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
          {subtitle && (
            <p
              className={`mt-0.5 truncate text-xs ${location ? "text-gray-500" : "text-gray-400"}`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function AgentClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<FarmClient[] | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<FarmClient | null>(null);

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
  }, [clients, search]);

  const handleNotify = async (message: string) => {
    if (!selectedClient) return;
    await api.agents.notifyClient({ clientId: selectedClient.id, message });
  };

  if (loading || !user) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-brand-900">Clients</h1>
      <p className="mb-6 text-sm text-gray-500">
        All fellows, clients, liaison officers, and researchers on the platform - tap a user to notify them when your farm products are available.
      </p>

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or location..."
          className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loadingClients ? (
        <PageContentSkeleton />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-200 px-4 py-12 text-center text-sm text-gray-500">
          {search.trim() ? "No users match your search." : "No users registered yet."}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onNotify={() => setSelectedClient(client)}
              />
            ))}
          </div>
        </>
      )}

      {selectedClient && (
        <NotifyClientModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSend={handleNotify}
        />
      )}
    </div>
  );
}
