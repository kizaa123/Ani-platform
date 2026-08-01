"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isAccountant, type AccountantOverview, type AccountantDashboardCharts } from "@/lib/types";
import { AccountantDashboardChartsPanel } from "@/components/accountant/AccountantDashboardCharts";
import { AnimatedStat } from "@/components/AnimatedStat";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { PageContentSkeleton, Skeleton } from "@/components/LoadingPrimitives";
import { aniPlatformSharePercentOfTotal } from "@/lib/handlerDisplayName";

function OverviewSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-48 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </>
  );
}

export default function AccountantOverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<AccountantOverview | null>(null);
  const [charts, setCharts] = useState<AccountantDashboardCharts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const [overviewData, chartsData] = await Promise.all([
        api.accountant.overview(),
        api.accountant.dashboardCharts(),
      ]);
      setOverview(overviewData);
      setCharts(chartsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load financial overview.");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAccountant(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!user || !isAccountant(user.roleId)) return;
    loadDashboard();
  }, [user, loading, router, loadDashboard]);

  if (loading || !user) return <PageContentSkeleton maxWidth="max-w-6xl" />;

  const formatMoney = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const showOverview = !pageLoading || overview;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">Financial Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          ANI earns through access fees, publication platform share (10%), and order-share remainder
        </p>
      </div>

      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadDashboard}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {!showOverview && <OverviewSkeleton />}

      {showOverview && overview && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              {
                label: "Total platform income",
                value: formatMoney(overview.totalRevenue),
                prefix: "GHC ",
                sub: "Access + publication share + order share",
                valueClass: "text-lg font-bold text-green-700",
              },
              {
                label: "Access income",
                value: formatMoney(overview.farmAccessRevenue + overview.legacyAccessRevenue),
                prefix: "GHC ",
                sub: `${overview.farmAccessCount + overview.legacyAccessCount} access payment(s)`,
                valueClass: "text-lg font-bold text-brand-800",
                href: "/accountant/transactions",
              },
              {
                label: "Publication share (10%)",
                value: formatMoney(overview.researchRevenue),
                prefix: "GHC ",
                sub: overview.researchGrossSales
                  ? `${overview.researchSaleCount} sale(s) · GHC ${formatMoney(overview.researchGrossSales)} gross`
                  : `${overview.researchSaleCount} sale(s)`,
                valueClass: "text-lg font-bold text-brand-800",
                href: "/accountant/transactions",
              },
              {
                label: "Order share income",
                value: formatMoney(overview.orderShareRevenue),
                prefix: "GHC ",
                sub: `${overview.orderShareCount} released order(s) · ~${aniPlatformSharePercentOfTotal(100).toFixed(2)}% each`,
                valueClass: "text-lg font-bold text-brand-800",
                href: "/accountant/withdrawals",
              },
              {
                label: "Available balance",
                value: formatMoney(overview.availableBalance),
                prefix: "GHC ",
                sub: "After completed withdrawals",
                valueClass: "text-lg font-bold text-brand-800",
              },
              {
                label: "Total withdrawn",
                value: formatMoney(overview.totalWithdrawn),
                prefix: "GHC ",
                sub: `${overview.withdrawalCount} withdrawal(s)`,
                valueClass: "text-lg font-bold text-brand-800",
                href: "/accountant/withdrawals",
              },
            ] as const
          ).map((kpi, i) => {
            const delay = scrollStagger(i, 90);
            const card = (
              <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{kpi.label}</p>
                <AnimatedStat
                  value={kpi.value}
                  prefix={"prefix" in kpi ? kpi.prefix : undefined}
                  delay={delay}
                  className={`mt-1 block ${kpi.valueClass}`}
                />
                <p className="mt-0.5 text-xs text-gray-500">{kpi.sub}</p>
              </div>
            );
            return (
              <ScrollReveal key={kpi.label} delay={delay} duration={450} direction="fade-up">
                {"href" in kpi && kpi.href ? (
                  <Link href={kpi.href} className="block transition hover:opacity-90">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {charts && (
        <div className="mb-6">
          <AccountantDashboardChartsPanel charts={charts} />
        </div>
      )}
    </div>
  );
}
