"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { ResearcherFinancialStatement, isResearcher } from "@/lib/types";

function formatGhc(amount: number) {
  return `GHC ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ResearcherFinancialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<ResearcherFinancialStatement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isResearcher(user.roleId)) router.push("/dashboard");
    if (user && isResearcher(user.roleId)) {
      api.research
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
        <Link href="/researcher/publications" className="text-sm text-brand-600 hover:underline">
          ← Back to Publications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">Financial Statement</h1>
        <p className="text-sm text-gray-500">
          Earnings from students who purchased your paid publications
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total earnings</p>
          <p className="mt-1 text-xl font-bold text-green-700">{formatGhc(summary.totalEarnings)}</p>
          <p className="text-xs text-gray-500">{summary.totalSales} sale(s)</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Publications</p>
          <p className="mt-1 text-xl font-bold text-brand-900">{summary.totalPublications}</p>
          <p className="text-xs text-gray-500">
            {summary.freePublications} free · {summary.paidPublications} paid
          </p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total views</p>
          <p className="mt-1 text-xl font-bold text-brand-900">{summary.totalViews}</p>
          <p className="text-xs text-gray-500">Across all publications</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Institution</p>
          <p className="mt-1 text-lg font-bold text-brand-900">{statement.institution || "—"}</p>
          <p className="text-xs text-gray-500">{statement.researcherName}</p>
        </div>
      </div>

      {statement.salesLineItems.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="border-b border-green-100 bg-green-50/50 px-6 py-4">
            <h3 className="text-base font-semibold text-brand-900">Sales & payments received</h3>
            <p className="text-sm text-gray-500">Students who purchased your paid content</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-4 py-3">Publication</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {statement.salesLineItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 font-medium text-brand-900">{item.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.studentName}
                      <span className="block text-xs text-gray-400">{item.studentEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{item.paymentMethod.replace("_", " ")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-green-700">{formatGhc(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 font-semibold text-green-800">
                  <td colSpan={4} className="px-6 py-4 text-right">
                    Total earnings
                  </td>
                  <td className="px-6 py-4 text-right">{formatGhc(summary.totalEarnings)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-900">Publication line items</h3>
        </div>
        {statement.lineItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">No publications yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-6 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {statement.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-6 py-3 text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 font-medium text-brand-900">{item.title}</td>
                    <td className="px-4 py-3">{item.isFree ? "Free" : "Paid"}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.viewCount}</td>
                    <td className="px-6 py-3 text-right font-semibold text-brand-900">
                      {item.isFree ? "Free" : formatGhc(item.price ?? 0)}
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
