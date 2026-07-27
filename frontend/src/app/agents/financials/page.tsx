"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { HandlerFinancialStatement, isBuyerHandler, isHandler } from "@/lib/types";
import { formatDate, formatGhc, orderStatusStyle } from "@/lib/format";

export default function HandlerFinancialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<HandlerFinancialStatement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.agents
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
  const isFarmerHandlerView = statement.handlerType === "farmer";

  function clientFinancialsHref(ownerId: string) {
    return isFarmerHandlerView
      ? `/agents/farm/${ownerId}/financials`
      : `/agents/buyer/${ownerId}/financials`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-brand-600 hover:underline">
          Back to Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Money Summary</h1>
        <p className="text-xs text-gray-500">
          {isFarmerHandlerView
            ? "What your farmer clients have earned from sales"
            : "What your buyer clients have spent"}
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              ANI Exchange
            </p>
            <h2 className="text-base font-bold text-brand-900">{statement.agentName}</h2>
            <p className="text-xs text-gray-500">
              {isBuyerHandler(user.roleId) ? "Buyer Handler" : "Farmer Handler"}
            </p>
          </div>
          <div className="text-left text-xs text-gray-500 sm:text-right">
            <p>Statement generated</p>
            <p className="font-medium text-brand-900">{formatDate(statement.generatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Assigned clients"
          value={String(summary.clientCount)}
          sub="Clients you manage"
        />
        {isFarmerHandlerView ? (
          <>
            <SummaryCard
              label="Total earned"
              value={formatGhc(summary.totalRevenue ?? 0)}
              sub={`${summary.totalSalesCount ?? 0} completed sale(s)`}
              accent="green"
            />
            <SummaryCard
              label="Orders"
              value={String(summary.transactionCount)}
              sub="Paid product orders"
            />
          </>
        ) : (
          <>
            <SummaryCard
              label="Total spent"
              value={formatGhc(summary.totalSpent ?? 0)}
              sub="Products + farm access"
            />
            <SummaryCard
              label="Product purchases"
              value={formatGhc(summary.totalProductSpend ?? 0)}
              sub="Paid marketplace orders"
              accent="green"
            />
            <SummaryCard
              label="Farm access fees"
              value={formatGhc(summary.totalFarmAccessSpend ?? 0)}
              sub="Completed access payments"
            />
          </>
        )}
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">By client</h3>
          <p className="text-xs text-gray-500">Totals for each client you manage</p>
        </div>

        {statement.clients.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">
            No clients assigned yet.{" "}
            <Link href="/agents" className="font-semibold text-brand-700 underline">
              View clients
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-[10px] font-semibold uppercase text-gray-500">
                  <th className="px-5 py-2.5">Client</th>
                  <th className="px-4 py-2.5 text-right">
                    {isFarmerHandlerView ? "Total earned" : "Total spent"}
                  </th>
                  <th className="px-4 py-2.5 text-right">Activity</th>
                  <th className="px-5 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody>
                {statement.clients.map((client) => (
                  <tr key={client.ownerId} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-brand-900">{client.clientLabel}</p>
                      <p className="text-[11px] text-gray-500">{client.clientName}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand-900">
                      {formatGhc(
                        isFarmerHandlerView ? (client.totalRevenue ?? 0) : (client.totalSpent ?? 0)
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {isFarmerHandlerView
                        ? `${client.salesCount ?? 0} sale(s)`
                        : `${client.orderCount ?? 0} order(s)`}
                    </td>
                    <td className="px-5 py-2.5">
                      <Link
                        href={clientFinancialsHref(client.ownerId)}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        View summary
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">Recent orders</h3>
          <p className="text-xs text-gray-500">Paid activity across your clients</p>
        </div>

        {statement.transactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">
            No orders yet for your assigned clients.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-[10px] font-semibold uppercase text-gray-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {statement.transactions.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-5 py-2.5 whitespace-nowrap text-gray-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-brand-900">{item.clientName}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {item.description}
                      <span className="block text-[11px] text-gray-400">{item.counterpartyName}</span>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-gray-500">
                      {item.type.replace("_", " ").toLowerCase()}
                    </td>
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
