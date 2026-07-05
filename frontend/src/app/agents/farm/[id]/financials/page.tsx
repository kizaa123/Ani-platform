"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FinancialStatement, isHandler } from "@/lib/types";
import { CountryBadge } from "@/components/CountrySelect";
import { HandlerClientNav } from "@/components/HandlerClientNav";
import { SalesOrdersTable } from "@/components/ProductOrdersList";
import { ProductOrderLineItem } from "@/lib/types";

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

function statusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-brand-100 text-brand-900";
    case "SOLD":
      return "bg-green-100 text-green-800";
    case "ARCHIVED":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

function toOrderLineItems(
  sales: FinancialStatement["salesLineItems"]
): ProductOrderLineItem[] {
  return sales.map((item) => ({
    id: item.id,
    date: typeof item.date === "string" ? item.date : String(item.date),
    productName: item.productName ?? item.title,
    productImage: item.productImage,
    commodity: item.commodity,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalAmount: item.totalValue,
    status: item.status,
    paymentMethod: item.paymentMethod ?? "",
    transactionId: item.transactionId,
    buyerName: item.buyerName ?? "—",
    buyerEmail: item.buyerEmail,
    buyerPhone: item.buyerPhone ?? "—",
    buyerLocation: item.buyerLocation ?? "—",
    buyerCountry: item.buyerCountry,
    buyerProfilePicture: item.buyerProfilePicture,
    purchaseCount: item.purchaseCount,
  }));
}

export default function HandlerClientFinancialsPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<FinancialStatement | null>(null);
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
        .then((res) => setStatement(res as unknown as import("@/lib/types").FinancialStatement))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    }
  }, [user?.id, loading, router, ownerId]);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <HandlerClientNav ownerId={ownerId} />
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      </div>
    );
  }

  if (!statement) {
    return <div className="p-12 text-center text-gray-500">Loading statement...</div>;
  }

  const { summary } = statement;
  const salesOrders = toOrderLineItems(statement.salesLineItems ?? []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <HandlerClientNav ownerId={ownerId} farmName={statement.farmName} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Financial statement</h1>
        <p className="text-gray-500">Farmer client revenue and product activity</p>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">ANI Exchange</p>
            <h2 className="text-xl font-bold text-brand-900">{statement.farmName}</h2>
            <p className="text-brand-700">{statement.farmerName}</p>
            <p className="text-sm text-gray-500">{statement.email}</p>
            <CountryBadge country={statement.country} region={statement.region} className="mt-2" />
          </div>
          <div className="text-left text-sm text-gray-500 sm:text-right">
            <p>Statement generated</p>
            <p className="font-medium text-brand-900">{formatDate(statement.generatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Listed inventory value" value={formatGhc(summary.totalListedValue)} sub={`${summary.activeListings} active`} />
        <SummaryCard label="Sales revenue" value={formatGhc(summary.totalSalesRevenue ?? 0)} sub={`${summary.totalSalesCount ?? 0} sales`} accent="green" />
        <SummaryCard label="Sold inventory value" value={formatGhc(summary.totalSoldValue)} sub={`${summary.soldListings} sold out`} />
        <SummaryCard label="Buyer connections" value={String(summary.acceptedConnections)} sub={`${summary.pendingConnections} pending`} />
        <SummaryCard label="Total products" value={String(summary.totalProducts)} sub="All time" />
      </div>

      {salesOrders.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="border-b border-green-100 bg-green-50/50 px-6 py-4">
            <h3 className="font-bold text-brand-900">Sales & payments received</h3>
            <p className="text-sm text-gray-500">Buyer purchases with contact details</p>
          </div>
          <SalesOrdersTable items={salesOrders} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 px-6 py-4">
          <h3 className="font-bold text-brand-900">Product line items</h3>
          <p className="text-sm text-gray-500">Products listed on the marketplace</p>
        </div>

        {statement.lineItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">No products listed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Commodity</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {statement.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(typeof item.date === "string" ? item.date : String(item.date))}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-900">{item.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.commodity}
                      <span className="block text-xs text-gray-400">{item.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatGhc(item.unitPrice)}/{item.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">
                      {formatGhc(item.totalValue)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyle(item.status)}`}
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
    <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent === "green" ? "text-green-700" : "text-brand-900"}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}
