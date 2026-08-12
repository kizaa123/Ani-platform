"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FarmClient, fullName, isAdmin } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { NotifyClientModal } from "@/components/NotifyClientModal";
import { PageContentSkeleton } from "@/components/LoadingPrimitives";

const ADMIN_NOTIFY_MESSAGE =
  "Important update from ConcordiaOrbis — please open your dashboard for details.";

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
          {client.roleLabel && location && (
            <p className="mt-0.5 truncate text-[11px] text-gray-400">{client.roleLabel}</p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function AdminClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<FarmClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<FarmClient | null>(null);

  const load = useCallback(async () => {
    setLoadingClients(true);
    setLoadError("");
    try {
      const list = await api.admin.clients();
      setClients(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setClients([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAdmin(user.roleId)) router.push("/dashboard");
    if (user && isAdmin(user.roleId)) load();
  }, [user, loading, router, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) => {
      const haystack = [fullName(c), c.roleLabel, c.city, c.region, c.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, search]);

  const handleNotify = async (message: string) => {
    if (!selectedClient) return;
    await api.admin.notifyClient({ clientId: selectedClient.id, message });
  };

  if (loading || !user) {
    return <PageContentSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="text-sm text-brand-600 hover:underline">
        Back to Admin
      </Link>
      <h1 className="mb-2 mt-4 text-2xl font-bold text-brand-900">Clients</h1>
      <p className="mb-6 text-sm text-gray-500">
        All fellows, clients, liaison officers, and researchers on the platform — tap a user to
        send them a platform notification.
      </p>

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, role, or location..."
          className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loadError && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

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
          defaultMessage={ADMIN_NOTIFY_MESSAGE}
          onClose={() => setSelectedClient(null)}
          onSend={handleNotify}
        />
      )}
    </div>
  );
}
