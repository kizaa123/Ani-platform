"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FarmClient, fullName, isFarmer } from "@/lib/types";
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
      <div className="flex min-w-0 items-center gap-3">
        <AvatarWithVerification
          src={client.profilePicture}
          name={client.firstName}
          size={72}
          verificationStatus={client.verificationStatus}
          verificationTags={client.verificationTags}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-brand-900">
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

export default function FarmClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<FarmClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<FarmClient | null>(null);

  const load = useCallback(async () => {
    setLoadingClients(true);
    try {
      const list = await api.farm.clients();
      setClients(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isFarmer(user.roleId)) router.push("/dashboard");
    if (user && isFarmer(user.roleId)) load();
  }, [user, loading, router, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) => {
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
    await api.farm.notifyClient({ clientId: selectedClient.id, message });
  };

  if (loading || !user) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-brand-900">Clients</h1>
      <p className="mb-6 text-sm text-gray-500">
        All clients and researchers on the platform — tap a client to notify them when your farm products are available.
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
          {search.trim() ? "No clients match your search." : "No clients registered yet."}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {filtered.length} client{filtered.length !== 1 ? "s" : ""}
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
