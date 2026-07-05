"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isStaff, fullName, type Connection, type AdminStats, type PendingVerificationUser } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { VerificationBadge } from "@/components/VerificationBadge";
import { formatDate, formatGhc } from "@/lib/format";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<PendingVerificationUser[]>([]);
  const [pendingConnections, setPendingConnections] = useState<Connection[]>([]);

  const loadConnections = useCallback(() => {
    api.connections
      .list()
      .then((rows) => setPendingConnections(rows.filter((c) => c.status === "PENDING")))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && isStaff(user.roleId)) {
      api.admin.stats().then((res: any) => setStats(res)).catch(console.error);
      api.admin.pending().then((res: any) => setPending(res)).catch(console.error);
      loadConnections();
    } else if (user) router.push("/dashboard");
  }, [user?.id, loading, router, loadConnections]);

  const verify = async (id: string, status: string) => {
    await api.admin.verify(id, status);
    setPending((p) => p.filter((u) => u.id !== id));
  };

  const updateConnection = async (id: string, status: string) => {
    await api.connections.updateStatus(id, status);
    loadConnections();
  };

  if (loading || !user) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-brand-900">Admin Panel</h1>

      {stats && (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries({
            Users: stats.users,
            Farmers: stats.farmers,
            Buyers: stats.buyers,
            Revenue: stats.totalRevenue,
          }).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-brand-700">
                {k === "Revenue" ? `GHC ${v}` : v}
              </p>
              <p className="text-sm text-gray-500">{k}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-brand-900">Pending Farm Access Requests</h2>
      {pendingConnections.length === 0 ? (
        <p className="mb-10 text-gray-500">No pending access requests.</p>
      ) : (
        <div className="mb-10 space-y-3">
          {pendingConnections.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-brand-100 bg-white p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <ProfilePhoto src={c.buyer?.profilePicture} name={c.buyer?.firstName} size={48} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Buyer</p>
                  <p className="font-bold text-brand-900">
                    {c.buyer ? fullName(c.buyer) : "Unknown buyer"}
                  </p>
                  {c.buyer?.verificationStatus && (
                    <VerificationBadge status={c.buyer.verificationStatus} className="mt-1" />
                  )}
                  <p className="mt-2 text-sm text-brand-700">
                    → {c.farmer?.farmName ?? (c.farmer ? fullName(c.farmer) : "Unknown farm")}
                  </p>
                  {c.farmer && (
                    <CountryBadge country={c.farmer.country} region={c.farmer.region} className="mt-1" />
                  )}
                  {c.accessPaid && c.farmAccess && (
                    <p className="mt-2 text-xs text-gray-600">
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
                  onClick={() => updateConnection(c.id, "ACCEPTED")}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => updateConnection(c.id, "REJECTED")}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-brand-900">Pending Verifications</h2>
      {pending.length === 0 ? (
        <p className="text-gray-500">No pending users.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white p-4"
            >
              <div>
                <p className="font-bold">{fullName(u)}</p>
                <p className="text-sm text-gray-500">
                  {u.email} · {u.role.roleName}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => verify(u.id, "VERIFIED")}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Verify
                </button>
                <button
                  onClick={() => verify(u.id, "REJECTED")}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
