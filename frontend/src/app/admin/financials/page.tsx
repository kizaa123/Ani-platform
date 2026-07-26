"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { PlatformFinancialStatement, isStaff } from "@/lib/types";
import { formatDate, formatGhc, orderStatusStyle } from "@/lib/format";

function typeLabel(type: PlatformFinancialStatement["lineItems"][number]["type"]) {
  switch (type) {
    case "PRODUCT_ORDER":
      return "Product order";
    case "FARM_ACCESS":
      return "Farm access";
    case "RESEARCH_SALE":
      return "Research sale";
    case "ACCESS_PACKAGE":
      return "Access package";
    default:
      return type;
  }
}

export default function AdminFinancialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<PlatformFinancialStatement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isStaff(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.admin
        .financialStatement()
        .then(setStatement)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    }
  }, [user?.id, loading, router]);

  if (loading || !user) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="rounded-xl bg-red-50 p-4 text-xs text-red-700">{error}</p>
      </div>
    );
  }

  if (!statement) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading statement...</div>;
  }

  const { summary } = statement;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-brand-600 hover:underline">
          Back to Admin
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Platform Financial Statement</h1>
        <p className="text-xs text-gray-500">
          All completed marketplace, access, and research transactions
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              ANI Platform
            </p>
            <h2 className="text-base font-bold text-brand-900">Revenue overview</h2>
            <p className="text-xs text-gray-500">Generated {formatDate(statement.generatedAt)}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Total revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatGhc(summary.totalRevenue)}</p>
            <p className="text-xs text-gray-500">{summary.transactionCount} transaction(s)</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Product orders"
          value={formatGhc(summary.productOrderRevenue)}
          sub={`${summary.productOrderCount} sale(s)`}
          accent="green"
        />
        <SummaryCard
          label="Farm access"
          value={formatGhc(summary.farmAccessRevenue)}
          sub={`${summary.farmAccessCount} payment(s)`}
        />
        <SummaryCard
          label="Research sales"
          value={formatGhc(summary.researchRevenue)}
          sub={`${summary.researchSaleCount} sale(s)`}
        />
        <SummaryCard
          label="Access packages"
          value={formatGhc(summary.accessPackageRevenue)}
          sub={`${summary.accessPackageCount} payment(s)`}
        />
        <SummaryCard
          label="Total revenue"
          value={formatGhc(summary.totalRevenue)}
          sub="All revenue streams"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">All transactions</h3>
          <p className="text-xs text-gray-500">Chronological list of completed platform payments</p>
        </div>

        {statement.lineItems.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">
            No completed transactions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-[10px] font-semibold uppercase text-gray-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Parties</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {statement.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-5 py-2.5 whitespace-nowrap text-gray-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{typeLabel(item.type)}</td>
                    <td className="px-4 py-2.5 font-medium text-brand-900">{item.description}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.partyName}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand-900">
                      {formatGhc(item.amount)}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${orderStatusStyle(item.status)}`}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-50 font-semibold text-brand-900">
                  <td colSpan={4} className="px-5 py-3 text-right text-xs">
                    Total platform revenue
                  </td>
                  <td className="px-4 py-3 text-right text-xs">{formatGhc(summary.totalRevenue)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "green";
}) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-3.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase text-gray-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${accent === "green" ? "text-green-700" : "text-brand-900"}`}
      >
        {value}
      </p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}
