"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isAccountant, type AccountantOverview, type AccountantIncomeChart } from "@/lib/types";
import { AccountantIncomeChartPanel } from "@/components/accountant/AccountantIncomeChart";
import { AnimatedStat } from "@/components/AnimatedStat";
import { formatGhc } from "@/lib/format";
import { PageContentSkeleton, Skeleton } from "@/components/LoadingPrimitives";

function OverviewSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-48 w-full rounded-xl" />
      </div>
    </>
  );
}

export default function AccountantOverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<AccountantOverview | null>(null);
  const [chart, setChart] = useState<AccountantIncomeChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAccountant(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!user || !isAccountant(user.roleId)) return;

    Promise.all([api.accountant.overview(), api.accountant.incomeChart()])
      .then(([overviewData, chartData]) => {
        setOverview(overviewData);
        setChart(chartData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load financial overview.");
      })
      .finally(() => setPageLoading(false));
  }, [user, loading, router]);

  if (loading || !user) return <PageContentSkeleton maxWidth="max-w-6xl" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-900">Financial Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform income, balances, and monthly growth
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/accountant/transactions"
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            All transactions
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setPageLoading(true);
              setError(null);
              Promise.all([api.accountant.overview(), api.accountant.incomeChart()])
                .then(([overviewData, chartData]) => {
                  setOverview(overviewData);
                  setChart(chartData);
                })
                .catch((err) => {
                  setError(err instanceof Error ? err.message : "Could not load financial overview.");
                })
                .finally(() => setPageLoading(false));
            }}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {pageLoading && !overview && <OverviewSkeleton />}

      {overview && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                {
                  label: "Total platform income",
                  value: formatGhc(overview.totalRevenue),
                  sub: `${overview.transactionCount} transaction(s)`,
                  valueClass: "text-xl font-bold text-green-700",
                },
                {
                  label: "Available balance",
                  value: formatGhc(overview.availableBalance),
                  sub: "After completed withdrawals",
                  valueClass: "text-xl font-bold text-brand-800",
                },
                {
                  label: "Total withdrawn",
                  value: formatGhc(overview.totalWithdrawn),
                  sub: `${overview.withdrawalCount} withdrawal(s)`,
                  valueClass: "text-xl font-bold text-brand-800",
                },
                {
                  label: "Pending farm access",
                  value: String(overview.pendingPaidConnections),
                  sub: "Paid — awaiting approval",
                  valueClass: "text-xl font-bold text-amber-700",
                  href: "/accountant/farm-access",
                },
              ] as const
            ).map((kpi) => {
              const card = (
                <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{kpi.label}</p>
                  <AnimatedStat value={kpi.value} className={`mt-1 block ${kpi.valueClass}`} />
                  <p className="mt-0.5 text-xs text-gray-500">{kpi.sub}</p>
                </div>
              );
              return "href" in kpi && kpi.href ? (
                <Link key={kpi.label} href={kpi.href} className="block transition hover:opacity-90">
                  {card}
                </Link>
              ) : (
                <div key={kpi.label}>{card}</div>
              );
            })}
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase text-gray-500">Product orders</p>
              <p className="mt-1 text-lg font-bold text-brand-900">{formatGhc(overview.productOrderRevenue)}</p>
              <p className="text-xs text-gray-500">{overview.productOrderCount} sale(s)</p>
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase text-gray-500">Farm access</p>
              <p className="mt-1 text-lg font-bold text-brand-900">{formatGhc(overview.farmAccessRevenue)}</p>
              <p className="text-xs text-gray-500">{overview.farmAccessCount} payment(s)</p>
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase text-gray-500">Research sales</p>
              <p className="mt-1 text-lg font-bold text-brand-900">{formatGhc(overview.researchRevenue)}</p>
              <p className="text-xs text-gray-500">{overview.researchSaleCount} sale(s)</p>
            </div>
          </div>
        </>
      )}

      {chart && (
        <div className="mb-6">
          <AccountantIncomeChartPanel chart={chart} />
        </div>
      )}
    </div>
  );
}
