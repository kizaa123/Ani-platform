"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Connection, fullName, isAccountant } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { VerificationBadge } from "@/components/VerificationBadge";
import { formatDate, formatGhc } from "@/lib/format";

export default function AccountantFarmAccessPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAccountant(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!user || !isAccountant(user.roleId)) return;

    api.connections
      .list()
      .then((rows) =>
        setConnections(rows.filter((c) => c.status === "PENDING" && c.accessPaid))
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load requests"))
      .finally(() => setPageLoading(false));
  }, [user, loading, router]);

  const reloadConnections = () => {
    api.connections
      .list()
      .then((rows) =>
        setConnections(rows.filter((c) => c.status === "PENDING" && c.accessPaid))
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load requests"));
  };

  const updateConnection = async (id: string, status: string) => {
    setUpdatingId(id);
    setError("");
    try {
      await api.connections.updateStatus(id, status);
      reloadConnections();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update request");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || !user) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/accountant" className="text-xs text-brand-600 hover:underline">
          ← Financial Overview
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Farm Access Approvals</h1>
        <p className="text-xs text-gray-500">
          Part of access income — approve buyer farm access after payment is confirmed
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-xs text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">
            Paid pending requests
            {connections.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {connections.length}
              </span>
            )}
          </h3>
        </div>

        <div className="p-4 sm:p-6">
          {pageLoading ? (
            <p className="text-gray-500">Loading…</p>
          ) : connections.length === 0 ? (
            <p className="text-gray-500">No paid farm access requests awaiting approval.</p>
          ) : (
            <div className="space-y-3">
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-brand-100 bg-white p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <AvatarWithVerification
                      src={c.buyer?.profilePicture}
                      name={c.buyer?.firstName}
                      size={56}
                      verificationStatus={c.buyer?.verificationStatus}
                      verificationTags={c.buyer?.verificationTags}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Buyer</p>
                      <p className="font-bold text-brand-900">
                        {c.buyer ? fullName(c.buyer) : "Unknown buyer"}
                      </p>
                      {c.buyer?.verificationStatus && (
                        <VerificationBadge adminView status={c.buyer.verificationStatus} className="mt-1" />
                      )}
                      <p className="mt-2 text-sm text-brand-700">
                        {c.farmer?.farmName ?? (c.farmer ? fullName(c.farmer) : "Unknown farm")}
                      </p>
                      {c.farmer && (
                        <CountryBadge country={c.farmer.country} region={c.farmer.region} className="mt-1" />
                      )}
                      {c.farmAccess && (
                        <p className="mt-2 text-xs font-semibold text-green-700">
                          Paid: {formatGhc(c.farmAccess.amount)} ·{" "}
                          {c.farmAccess.paymentMethod.replace("_", " ")}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={updatingId === c.id}
                      onClick={() => updateConnection(c.id, "ACCEPTED")}
                      className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Approve access
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === c.id}
                      onClick={() => updateConnection(c.id, "REJECTED")}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
