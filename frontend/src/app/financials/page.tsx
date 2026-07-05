"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { BuyerFinancialStatement, isBuyer } from "@/lib/types";
import { formatDate, formatGhc, orderStatusStyle } from "@/lib/format";

export default function BuyerFinancialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<BuyerFinancialStatement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isBuyer(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.buyer
        .financialStatement()
        .then(setStatement)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    }
  }, [user?.id, loading, router]);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
        <p className="mt-3 text-sm text-gray-500">
          If this says &quot;Route not found&quot;, restart the backend server so the buyer API routes load.
        </p>
      </div>
    );
  }

  if (!statement) {
    return <div className="p-12 text-center text-gray-500">Loading statement...</div>;
  }

  const { summary } = statement;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">Financial Statement</h1>
        <p className="text-sm text-gray-500">Spending overview and farm access fees</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total spent</p>
          <p className="mt-1 text-xl font-bold text-brand-900">{formatGhc(summary.totalSpent)}</p>
          <p className="text-xs text-gray-500">Products + farm access</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Product purchases</p>
          <p className="mt-1 text-xl font-bold text-green-700">{formatGhc(summary.totalProductSpend)}</p>
          <p className="text-xs text-gray-500">{summary.paidOrders} paid order(s)</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Farm access fees</p>
          <p className="mt-1 text-xl font-bold text-brand-800">{formatGhc(summary.totalFarmAccessSpend)}</p>
          <p className="text-xs text-gray-500">{summary.farmsAccessed} farm(s) unlocked</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total orders</p>
          <p className="mt-1 text-xl font-bold text-brand-900">{summary.totalOrders}</p>
          <Link href="/orders" className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline">
            View all orders →
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-900">Farm access payments</h3>
          <p className="text-sm text-gray-500">Fees paid to unlock farmer profiles and products</p>
        </div>

        {statement.farmAccessPayments.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No farm access payments yet.{" "}
            <Link href="/access" className="font-semibold text-brand-700 underline">
              Access a farm
            </Link>{" "}
            to browse and purchase products.
          </div>
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
              <tfoot>
                <tr className="bg-brand-50 font-semibold text-brand-900">
                  <td colSpan={2} className="px-6 py-4 text-right">
                    Total farm access spend
                  </td>
                  <td className="px-4 py-4 text-right">{formatGhc(summary.totalFarmAccessSpend)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Product purchase details are on{" "}
        <Link href="/orders" className="text-brand-700 underline">
          My Orders
        </Link>
        . Totals here include confirmed paid orders only.
      </p>
    </div>
  );
}
