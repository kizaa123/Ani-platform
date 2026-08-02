"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  isAdmin,
  isFarmer,
  isHandler,
  isBuyer,
  fullName,
  type AdminStats,
  type AdminDashboardCharts,
  type AdminVerificationUser,
  type VerificationTagType,
} from "@/lib/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { VerificationTagBadge } from "@/components/VerificationTagBadge";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminPlatformIncomeCard } from "@/components/admin/AdminPlatformIncomeCard";
import { AdminDashboardChartsPanel } from "@/components/admin/AdminDashboardCharts";
import { AnimatedStat } from "@/components/AnimatedStat";
import { ScrollReveal } from "@/components/ScrollReveal";
import { EmailText } from "@/components/EmailText";
import { formatDate } from "@/lib/format";
import { roleSummaryLabel } from "@/lib/registerValidation";
import { scrollStagger } from "@/lib/scrollStagger";
import { Skeleton, PageContentSkeleton } from "@/components/LoadingPrimitives";

type RoleFilter = "all" | "farmers" | "buyers" | "handlers";
type StatusFilter = "all" | "PENDING" | "VERIFIED" | "REJECTED";

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
      <div className="mb-8">
        <div className="card-elevated rounded-2xl p-5 sm:p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-10 w-48" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
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

function instituteName(user: AdminVerificationUser): string | null {
  if (user.farmerProfile?.farmName) return user.farmerProfile.farmName;
  if (user.buyerProfile?.company) return user.buyerProfile.company;
  if (user.researcherProfile?.institution) return user.researcherProfile.institution;
  return null;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [charts, setCharts] = useState<AdminDashboardCharts | null>(null);
  const [users, setUsers] = useState<AdminVerificationUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [tagBusy, setTagBusy] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    const params = statusFilter === "all" ? undefined : { status: statusFilter };
    setUsersLoading(true);
    api.admin
      .users(params)
      .then((rows) => setUsers(rows))
      .catch(console.error)
      .finally(() => setUsersLoading(false));
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
    if (user && !isAdmin(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!user || !isAdmin(user.roleId)) return;

    const params = statusFilter === "all" ? undefined : { status: statusFilter };
    Promise.all([api.admin.stats(), api.admin.dashboardCharts(), api.admin.users(params)])
      .then(([statsData, chartsData, userRows]) => {
        setStats(statsData);
        setCharts(chartsData);
        setUsers(userRows);
      })
      .catch((err) => {
        console.error(err);
        setDashboardError(
          err instanceof Error ? err.message : "Could not load dashboard analytics."
        );
      })
      .finally(() => {
        setDashboardLoading(false);
        setUsersLoading(false);
      });
  }, [user, loading, router, statusFilter]);

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

  const internationalTagsForUser = (user: AdminVerificationUser) =>
    (user.verificationTags ?? []).filter((tag) => tag.tagType !== "STANDARD");

  const assignableTagsForUser = (user: AdminVerificationUser): VerificationTagType[] => {
    const existing = new Set((user.verificationTags ?? []).map((t) => t.tagType));
    const options: VerificationTagType[] = [];
    if (isFarmer(user.roleId) && !existing.has("INTERNATIONAL_FARMER")) {
      options.push("INTERNATIONAL_FARMER");
    }
    if ((isBuyer(user.roleId) || user.roleId === 8) && !existing.has("INTERNATIONAL_BUYER")) {
      options.push("INTERNATIONAL_BUYER");
    }
    return options;
  };

  const assignTagLabel = (tagType: VerificationTagType) =>
    tagType === "INTERNATIONAL_FARMER" ? "International Fellow" : "International Client";

  const assignTag = async (userId: string, tagType: VerificationTagType) => {
    setTagBusy(`${userId}:${tagType}`);
    try {
      await api.admin.assignVerificationTag(userId, tagType);
      loadUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setTagBusy(null);
    }
  };

  const removeTag = async (userId: string, tagType: VerificationTagType) => {
    setTagBusy(`${userId}:${tagType}`);
    try {
      await api.admin.removeVerificationTag(userId, tagType);
      loadUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setTagBusy(null);
    }
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
            href="/admin/staff"
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            Manage Team
          </Link>
          <Link
            href="/admin/ads"
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            Internal Ads
          </Link>
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
          {(
            [
              { label: "Total Users", value: stats.users, icon: "users" as const, accent: "forest" as const },
              { label: "Fellows", value: stats.farmers, icon: "sprout" as const, accent: "green" as const },
              { label: "Clients", value: stats.buyers, icon: "store" as const, accent: "teal" as const },
              {
                label: "Client Liaison Officers",
                value: stats.buyerHandlers,
                icon: "handshake" as const,
                accent: "gold" as const,
                hint: "Client liaison officers",
              },
              {
                label: "Fellow Liaison Officers",
                value: stats.farmerHandlers,
                icon: "user-plus" as const,
                accent: "emerald" as const,
                hint: "Fellow liaison officers",
              },
            ] as const
          ).map((card, i) => {
            const delay = scrollStagger(i, 90);
            return (
              <ScrollReveal key={card.label} delay={delay} duration={450} direction="fade-up">
                <AdminStatCard
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  accent={card.accent}
                  hint={"hint" in card ? card.hint : undefined}
                  animated
                  animationDelay={delay}
                />
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {stats && (
        <ScrollReveal delay={scrollStagger(0, 90)} duration={450} direction="fade-up">
          <div className="mb-8">
            <AdminPlatformIncomeCard
              totalPlatformIncome={stats.totalPlatformIncome}
              accessIncome={stats.accessIncome}
              orderShareIncome={stats.orderShareIncome}
              accessPaymentCount={stats.accessPaymentCount}
              orderShareCount={stats.orderShareCount}
              animationDelay={scrollStagger(0, 90)}
            />
          </div>
        </ScrollReveal>
      )}

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "Platform revenue",
                value: stats.totalRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                prefix: "GHC ",
                valueClass: "text-xl font-bold text-brand-800",
              },
              {
                label: "Active listings",
                value: String(stats.listings),
                valueClass: "text-xl font-bold text-brand-800",
              },
              {
                label: "Active connections",
                value: String(stats.activeConnections),
                valueClass: "text-xl font-bold text-brand-800",
              },
              {
                label: "Pending actions",
                value: String(stats.pendingVerifications + stats.pendingConnections),
                valueClass: "text-xl font-bold text-amber-700",
                subtext: `${stats.pendingVerifications} verifications · ${stats.pendingConnections} access requests`,
              },
            ] as const
          ).map((kpi, i) => {
            const delay = scrollStagger(i, 90);
            return (
              <ScrollReveal key={kpi.label} delay={delay} duration={450} direction="fade-up">
                <div className="card-elevated rounded-2xl p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{kpi.label}</p>
                  <AnimatedStat
                    value={kpi.value}
                    prefix={"prefix" in kpi ? kpi.prefix : undefined}
                    delay={delay}
                    className={`mt-1 block ${kpi.valueClass}`}
                  />
                  {"subtext" in kpi && kpi.subtext && (
                    <p className="mt-0.5 text-xs text-gray-500">{kpi.subtext}</p>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
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
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm"
          >
            User Verification
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-brand-900">User Verification</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Verify clients, fellows, and liaison officers.
                    {pendingCount > 0 && ` ${pendingCount} pending.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All roles"],
                      ["farmers", "Fellows"],
                      ["buyers", "Clients"],
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
                    onClick={() => {
                      setUsersLoading(true);
                      setStatusFilter(value);
                    }}
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

              {usersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/30 px-6 py-10 text-center">
                  <p className="font-semibold text-brand-900">No users match the selected filters</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Try changing the role or status filter to see more accounts.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Email</th>
                        <th className="pb-3 pr-4">Role</th>
                        <th className="pb-3 pr-4">Institute name</th>
                        <th className="pb-3 pr-4">Date joined</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-50">
                      {filteredUsers.map((u) => {
                        const institute = instituteName(u);
                        const busy = verifyingId === u.id;
                        const tagOptions = assignableTagsForUser(u);
                        const intlTags = internationalTagsForUser(u);
                        const hasTagRow =
                          tagOptions.length > 0 ||
                          intlTags.length > 0 ||
                          u.verificationStatus === "VERIFIED";

                        return (
                          <Fragment key={u.id}>
                            <tr className="align-top">
                              <td className="py-3 pr-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-brand-900">{fullName(u)}</span>
                                  {u.verificationStatus !== "VERIFIED" && (
                                    <VerificationBadge adminView status={u.verificationStatus} />
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-gray-700">
                                <EmailText email={u.email} />
                              </td>
                              <td className="py-3 pr-4 text-gray-700">{roleSummaryLabel(u.roleId)}</td>
                              <td className="py-3 pr-4 text-gray-700">
                                {institute ?? <span className="text-gray-400">—</span>}
                              </td>
                              <td className="py-3 pr-4 whitespace-nowrap text-gray-500">
                                {formatDate(u.createdAt)}
                              </td>
                              <td className="py-3">
                                <div className="flex flex-wrap gap-2">
                                  {u.verificationStatus !== "VERIFIED" && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => verify(u.id, "VERIFIED")}
                                      className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Verify
                                    </button>
                                  )}
                                  {u.verificationStatus === "VERIFIED" && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => verify(u.id, "PENDING")}
                                      className="rounded-lg border border-yellow-300 px-3 py-1.5 text-xs font-semibold text-yellow-800 disabled:opacity-50"
                                    >
                                      Unverify
                                    </button>
                                  )}
                                  {u.verificationStatus !== "REJECTED" && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => verify(u.id, "REJECTED")}
                                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  )}
                                  {u.verificationStatus === "REJECTED" && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => verify(u.id, "PENDING")}
                                      className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 disabled:opacity-50"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {hasTagRow && (
                              <tr className="bg-brand-50/30">
                                <td colSpan={6} className="px-0 pb-3 pt-0">
                                  <div className="flex flex-wrap items-center gap-2 px-0 py-2">
                                    {u.verificationStatus === "VERIFIED" && (
                                      <VerificationTagBadge tagType="STANDARD" showLabel />
                                    )}
                                    {intlTags.map((tag) => (
                                      <VerificationTagBadge
                                        key={tag.id}
                                        tagType={tag.tagType}
                                        showLabel
                                        removing={tagBusy === `${u.id}:${tag.tagType}`}
                                        onRemove={() => void removeTag(u.id, tag.tagType)}
                                      />
                                    ))}
                                    {tagOptions.map((tagType) => (
                                      <button
                                        key={tagType}
                                        type="button"
                                        disabled={tagBusy === `${u.id}:${tagType}`}
                                        onClick={() => void assignTag(u.id, tagType)}
                                        className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                                      >
                                        + {assignTagLabel(tagType)}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
    </div>
  );
}
