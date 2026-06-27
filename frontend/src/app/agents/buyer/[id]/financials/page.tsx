"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { BuyerFinancialStatement, isHandler } from "@/lib/types";
import { CountryBadge } from "@/components/CountrySelect";
import { HandlerBuyerClientNav } from "@/components/HandlerBuyerClientNav";
import { formatDate, formatGhc, orderStatusStyle } from "@/lib/format";

export default function HandlerClientBuyerFinancialsPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<BuyerFinancialStatement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user && ownerId) {
      api.agents
        .clientFinancialStatement(ownerId)
        .then((data) => setStatement(data as BuyerFinancialStatement))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    }
  }, [user?.id, loading, router, ownerId]);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <HandlerBuyerClientNav ownerId={ownerId} />
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  if (!statement) {
    return <div className="p-12 text-center text-gray-500">Loading statement...</div>;
  }

  const { summary } = statement;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <HandlerBuyerClientNav ownerId={ownerId} buyerName={statement.buyerName} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Financial statement</h1>
        <p className="text-gray-500">Full spending overview for your assigned buyer</p>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">ANI Exchange</p>
            <h2 className="text-xl font-bold text-brand-900">{statement.buyerName}</h2>
            {statement.company && <p className="text-brand-700">{statement.company}</p>}
            <p className="text-sm text-gray-500">{statement.email}</p>
            <CountryBadge country={statement.country} region={statement.region} className="mt-2" />
          </div>
          <div className="text-left text-sm text-gray-500 sm:text-right">
            <p>Statement generated</p>
            <p className="font-medium text-brand-900">{formatDate(statement.generatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total spent" value={formatGhc(summary.totalSpent)} sub="Products + farm access" />
        <SummaryCard label="Product purchases" value={formatGhc(summary.totalProductSpend)} sub={`${summary.paidOrders} paid order(s)`} accent="green" />
        <SummaryCard label="Farm access fees" value={formatGhc(summary.totalFarmAccessSpend)} sub={`${summary.farmsAccessed} farm(s) unlocked`} />
        <SummaryCard
          label="Total orders"
          value={String(summary.totalOrders)}
          sub={
            <Link href={`/agents/buyer/${ownerId}/orders`} className="font-semibold text-brand-700 hover:underline">
              View orders →
            </Link>
          }
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-6 py-4">
          <h3 className="font-bold text-brand-900">Farm access payments</h3>
          <p className="text-sm text-gray-500">Fees your buyer paid to unlock farmer profiles</p>
        </div>

        {statement.farmAccessPayments.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">No farm access payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-4 py-3">Farmer / Farm</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {statement.farmAccessPayments.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{item.farmerName}</p>
                      {item.farmName && <p className="text-xs text-brand-700">{item.farmName}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">
                      {formatGhc(item.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${orderStatusStyle(item.status)}`}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs capitalize text-gray-500">
                      {item.paymentMethod.replace("_", " ")}
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
  sub: React.ReactNode;
  accent?: "green";
}) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent === "green" ? "text-green-700" : "text-brand-900"}`}>
        {value}
      </p>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}
