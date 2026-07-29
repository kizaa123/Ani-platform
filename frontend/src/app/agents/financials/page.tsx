"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { HandlerFinancialStatement, isHandler } from "@/lib/types";
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
  const paymentRows = statement.handlerPayments ?? statement.transactions;

  function clientHref(ownerId: string) {
    return isFarmerHandlerView
      ? `/agents/farm/${ownerId}/orders`
      : `/agents/buyer/${ownerId}/financials`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-brand-600 hover:underline">
          Back to Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Money Summary</h1>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Assigned clients"
          value={String(summary.clientCount)}
          sub="Clients you manage"
        />
        <SummaryCard
          label="Total earned"
          value={formatGhc(summary.totalRevenue ?? 0)}
          sub={`${summary.totalSalesCount ?? 0} distributed payment(s)`}
          accent="green"
        />
        <SummaryCard
          label="Commission payments"
          value={String(summary.transactionCount)}
          sub="Your 10% liaison share"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">Payments received</h3>
          <p className="text-xs text-gray-500">
            Your liaison commission after ANI Accountant distributes order funds
          </p>
        </div>

        {paymentRows.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">
            No commission payments yet. Payments appear here after successful delivery and accountant
            distribution.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-[10px] font-semibold uppercase text-gray-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5 text-right">Commission</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-5 py-2.5 whitespace-nowrap text-gray-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-brand-900">{item.clientName}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      <span className="font-medium text-brand-900">
                        {item.orderName ?? item.description}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-400">
                        {item.counterpartyName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                      {formatGhc(item.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${orderStatusStyle(item.status)}`}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <Link
                        href={clientHref(item.ownerId)}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {isFarmerHandlerView ? "View orders" : "View client"}
                      </Link>
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
