"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { PlatformFinancialStatement, isAdmin } from "@/lib/types";
import { formatDate, formatGhc, orderStatusStyle } from "@/lib/format";

type LineItemType = PlatformFinancialStatement["lineItems"][number]["type"];
type FinancialFilter = LineItemType | "ALL";

function typeLabel(type: LineItemType) {
  switch (type) {
    case "PRODUCT_ORDER":
      return "Product order";
    case "FARM_ACCESS":
      return "Farm access payment";
    case "RESEARCH_SALE":
      return "Research sale";
    default:
      return type;
  }
}

function filterLabel(filter: FinancialFilter) {
  switch (filter) {
    case "PRODUCT_ORDER":
      return "Product orders";
    case "FARM_ACCESS":
      return "Farm access payments";
    case "RESEARCH_SALE":
      return "Research sales";
    default:
      return "All payments";
  }
}

export default function AdminFinancialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<PlatformFinancialStatement | null>(null);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FinancialFilter>("ALL");

  const openOrderStatement = async (orderId: string) => {
    setOpeningId(orderId);
    try {
      await api.orders.statement(orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open statement");
    } finally {
      setOpeningId(null);
    }
  };

  const toggleFilter = (filter: FinancialFilter) => {
    setActiveFilter((current) => (current === filter ? "ALL" : filter));
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAdmin(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user && isAdmin(user.roleId)) {
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
  const filteredLineItems =
    activeFilter === "ALL"
      ? statement.lineItems
      : statement.lineItems.filter((item) => item.type === activeFilter);
  const filteredTotal = filteredLineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-brand-600 hover:underline">
          Back to Admin
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Platform Money Summary</h1>
        <p className="text-xs text-gray-500">
          All completed payments on the platform
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              ANI
            </p>
            <h2 className="text-base font-bold text-brand-900">Money overview</h2>
            <p className="text-xs text-gray-500">Generated {formatDate(statement.generatedAt)}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Total earned</p>
            <p className="text-2xl font-bold text-green-700">{formatGhc(summary.totalRevenue)}</p>
            <p className="text-xs text-gray-500">{summary.transactionCount} payment(s)</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Product orders"
          value={formatGhc(summary.productOrderRevenue)}
          sub={`${summary.productOrderCount} sale(s)`}
          accent="green"
          active={activeFilter === "PRODUCT_ORDER"}
          onClick={() => toggleFilter("PRODUCT_ORDER")}
        />
        <SummaryCard
          label="Farm access payments"
          value={formatGhc(summary.farmAccessRevenue)}
          sub={`${summary.farmAccessCount} payment(s)`}
          active={activeFilter === "FARM_ACCESS"}
          onClick={() => toggleFilter("FARM_ACCESS")}
        />
        <SummaryCard
          label="Research sales"
          value={formatGhc(summary.researchRevenue)}
          sub={`${summary.researchSaleCount} sale(s)`}
          active={activeFilter === "RESEARCH_SALE"}
          onClick={() => toggleFilter("RESEARCH_SALE")}
        />
        <SummaryCard
          label="Total earned"
          value={formatGhc(summary.totalRevenue)}
          sub="All payment types"
          active={activeFilter === "ALL"}
          onClick={() => toggleFilter("ALL")}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">{filterLabel(activeFilter)}</h3>
          <p className="text-xs text-gray-500">
            {activeFilter === "ALL"
              ? "Completed payments in date order — click a summary card to filter"
              : `${filteredLineItems.length} matching payment(s) — click the card again to show all`}
          </p>
        </div>

        {filteredLineItems.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">
            {activeFilter === "ALL"
              ? "No completed payments yet."
              : `No ${filterLabel(activeFilter).toLowerCase()} yet.`}
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
                  <th className="px-5 py-2.5">Statement</th>
                </tr>
              </thead>
              <tbody>
                {filteredLineItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-brand-50 hover:bg-brand-50/30 ${
                      activeFilter !== "ALL" ? "bg-brand-50/20" : ""
                    }`}
                  >
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
                    <td className="px-5 py-2.5">
                      {item.type === "PRODUCT_ORDER" ? (
                        item.escrowStatus === "RELEASED" || Boolean("otpVerifiedAt" in item && item.otpVerifiedAt) ? (
                          <button
                            type="button"
                            onClick={() => openOrderStatement(item.id)}
                            disabled={openingId === item.id}
                            className="text-[10px] font-semibold text-brand-700 hover:underline disabled:opacity-50"
                          >
                            {openingId === item.id ? "…" : "View PDF"}
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-200"
                            title="PDF locked until delivery is confirmed"
                          >
                            Locked
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-50 font-semibold text-brand-900">
                  <td colSpan={4} className="px-5 py-3 text-right text-xs">
                    {activeFilter === "ALL" ? "Total platform earnings" : `${filterLabel(activeFilter)} total`}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {formatGhc(activeFilter === "ALL" ? summary.totalRevenue : filteredTotal)}
                  </td>
                  <td colSpan={2} />
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
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "green";
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-3.5 text-left shadow-sm transition-colors ${
        active
          ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-200"
          : "border-brand-100 hover:border-brand-200 hover:bg-brand-50/30"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase text-gray-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${accent === "green" ? "text-green-700" : "text-brand-900"}`}
      >
        {value}
      </p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </button>
  );
}
