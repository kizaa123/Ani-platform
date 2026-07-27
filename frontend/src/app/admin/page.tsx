"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  isStaff,
  isFarmer,
  isHandler,
  isBuyer,
  fullName,
  type Connection,
  type AdminStats,
  type AdminDashboardCharts,
  type AdminVerificationUser,
} from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { VerificationBadge } from "@/components/VerificationBadge";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminDashboardChartsPanel } from "@/components/admin/AdminDashboardCharts";
import { formatDate, formatGhc } from "@/lib/format";
import { Skeleton, PageContentSkeleton } from "@/components/LoadingPrimitives";

type RoleFilter = "all" | "farmers" | "buyers" | "handlers";
type StatusFilter = "all" | "PENDING" | "VERIFIED" | "REJECTED";
type AdminTab = "verification" | "connections";

function AdminDashboardSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-2xl p-5 sm:p-6">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-2xl p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="mb-10 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-2xl p-5 sm:p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-40 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </>
  );
}

function matchesRoleFilter(user: AdminVerificationUser, roleFilter: RoleFilter) {
  if (roleFilter === "all") return true;
  if (roleFilter === "farmers") return isFarmer(user.roleId);
  if (roleFilter === "buyers") return isBuyer(user.roleId);
  if (roleFilter === "handlers") return isHandler(user.roleId);
  return true;
}

function userSubtitle(user: AdminVerificationUser) {
  if (user.farmerProfile?.farmName) return user.farmerProfile.farmName;
  if (user.buyerProfile?.company) return user.buyerProfile.company;
  if (user.agentProfile?.agentType) {
    return user.agentProfile.agentType.replace(/_/g, " ");
  }
  return null;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [charts, setCharts] = useState<AdminDashboardCharts | null>(null);
  const [users, setUsers] = useState<AdminVerificationUser[]>([]);
  const [pendingConnections, setPendingConnections] = useState<Connection[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [activeTab, setActiveTab] = useState<AdminTab>("verification");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const loadConnections = useCallback(() => {
    api.connections
      .list()
      .then((rows) => setPendingConnections(rows.filter((c) => c.status === "PENDING")))
      .catch(console.error);
  }, []);

  const loadUsers = useCallback(() => {
    const params = statusFilter === "all" ? undefined : { status: statusFilter };
    api.admin
      .users(params)
      .then((rows) => setUsers(rows))
      .catch(console.error);
  }, [statusFilter]);

  const loadDashboard = useCallback(() => {
    setDashboardLoading(true);
    setDashboardError(null);
    Promise.all([api.admin.stats(), api.admin.dashboardCharts()])
      .then(([statsData, chartsData]) => {
        setStats(statsData);
        setCharts(chartsData);
      })
      .catch((err) => {
        console.error(err);
        setDashboardError(
          err instanceof Error ? err.message : "Could not load dashboard analytics."
        );
      })
      .finally(() => setDashboardLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && isStaff(user.roleId)) {
      loadDashboard();
      loadUsers();
      loadConnections();
    } else if (user) router.push("/dashboard");
  }, [user, loading, router, loadConnections, loadUsers, loadDashboard]);

  const verify = async (id: string, status: string) => {
    setVerifyingId(id);
    try {
      await api.admin.verify(id, status);
      loadUsers();
      loadDashboard();
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  };

  const updateConnection = async (id: string, status: string) => {
    await api.connections.updateStatus(id, status);
    loadConnections();
    loadDashboard();
  };

  const filteredUsers = users.filter((u) => matchesRoleFilter(u, roleFilter));
  const pendingCount = users.filter((u) => u.verificationStatus === "PENDING").length;

  if (loading || !user) return <PageContentSkeleton maxWidth="max-w-7xl" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform overview, analytics, and moderation tools
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/financials"
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            Financial Statement
          </Link>
          <Link href="/dashboard" className="btn-outline px-4 py-2 text-sm">
            Back to Portal
          </Link>
        </div>
      </div>

      {dashboardError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{dashboardError}</span>
          <button
            type="button"
            onClick={loadDashboard}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {dashboardLoading && !stats && <AdminDashboardSkeleton />}

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AdminStatCard label="Total Users" value={stats.users} icon="users" accent="forest" />
          <AdminStatCard label="Farmers" value={stats.farmers} icon="sprout" accent="green" />
          <AdminStatCard label="Buyers" value={stats.buyers} icon="store" accent="teal" />
          <AdminStatCard
            label="Client Liaison Officers"
            value={stats.buyerHandlers}
            icon="handshake"
            accent="gold"
            hint="Buyer handlers"
          />
          <AdminStatCard
            label="Fellow Liaison Officers"
            value={stats.farmerHandlers}
            icon="user-plus"
            accent="emerald"
            hint="Farmer handlers"
          />
        </div>
      )}

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-elevated rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Platform revenue</p>
            <p className="mt-1 text-xl font-bold text-brand-800">{formatGhc(stats.totalRevenue)}</p>
          </div>
          <div className="card-elevated rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active listings</p>
            <p className="mt-1 text-xl font-bold text-brand-800">{stats.listings}</p>
          </div>
          <div className="card-elevated rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active connections</p>
            <p className="mt-1 text-xl font-bold text-brand-800">{stats.activeConnections}</p>
          </div>
          <div className="card-elevated rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending actions</p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              {stats.pendingVerifications + stats.pendingConnections}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {stats.pendingVerifications} verifications · {stats.pendingConnections} access requests
            </p>
          </div>
        </div>
      )}

      {charts && (
        <div className="mb-10">
          <AdminDashboardChartsPanel charts={charts} />
        </div>
      )}

      <div className="card-elevated overflow-hidden rounded-2xl">
        <div className="flex flex-wrap gap-1 border-b border-brand-100 bg-brand-50/50 p-2">
          <button
            type="button"
            onClick={() => setActiveTab("verification")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "verification"
                ? "bg-white text-brand-900 shadow-sm"
                : "text-gray-500 hover:text-brand-700"
            }`}
          >
            User Verification
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("connections")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "connections"
                ? "bg-white text-brand-900 shadow-sm"
                : "text-gray-500 hover:text-brand-700"
            }`}
          >
            Farm Access Requests
            {pendingConnections.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {pendingConnections.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "connections" ? (
            <>
              <p className="mb-4 text-sm text-gray-500">
                Review buyer requests for farm access after payment.
              </p>
              {pendingConnections.length === 0 ? (
                <p className="text-gray-500">No pending access requests.</p>
              ) : (
                <div className="space-y-3">
                  {pendingConnections.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-brand-100 bg-white p-4"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <ProfilePhoto src={c.buyer?.profilePicture} name={c.buyer?.firstName} size={56} />
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
                          Accept
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
            </>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-brand-900">User Verification</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Verify buyers, farmers, and handlers.
                    {pendingCount > 0 && ` ${pendingCount} pending.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All roles"],
                      ["farmers", "Farmers"],
                      ["buyers", "Buyers"],
                      ["handlers", "Handlers"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRoleFilter(value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        roleFilter === value
                          ? "bg-brand-700 text-white"
                          : "border border-brand-200 text-brand-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ["PENDING", "Pending"],
                    ["VERIFIED", "Verified"],
                    ["REJECTED", "Rejected"],
                    ["all", "All statuses"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      statusFilter === value
                        ? "bg-brand-100 text-brand-900"
                        : "text-gray-500 hover:text-brand-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-gray-500">No users match the selected filters.</p>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((u) => {
                    const subtitle = userSubtitle(u);
                    const busy = verifyingId === u.id;
                    return (
                      <div
                        key={u.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-brand-900">{fullName(u)}</p>
                            <VerificationBadge adminView status={u.verificationStatus} />
                          </div>
                          <p className="text-sm text-gray-500">
                            {u.email} · {u.role.roleName}
                            {subtitle ? ` · ${subtitle}` : ""}
                          </p>
                          <p className="text-xs text-gray-400">Joined {formatDate(u.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {u.verificationStatus !== "VERIFIED" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => verify(u.id, "VERIFIED")}
                              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              Verify
                            </button>
                          )}
                          {u.verificationStatus === "VERIFIED" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => verify(u.id, "PENDING")}
                              className="rounded-lg border border-yellow-300 px-4 py-2 text-sm font-semibold text-yellow-800 disabled:opacity-50"
                            >
                              Unverify
                            </button>
                          )}
                          {u.verificationStatus !== "REJECTED" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => verify(u.id, "REJECTED")}
                              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                          {u.verificationStatus === "REJECTED" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => verify(u.id, "PENDING")}
                              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-50"
                            >
                              Reset to Pending
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
