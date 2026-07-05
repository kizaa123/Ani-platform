"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { FinancialStatement, ROLES } from "@/lib/types";
import { CountryBadge } from "@/components/CountrySelect";
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

export default function FinancialStatementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<FinancialStatement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (
      user &&
      ![ROLES.CROP_FARMER, ROLES.LIVESTOCK_FARMER].includes(user.roleId as 1 | 2)
    ) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.farm
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
  const salesOrders: ProductOrderLineItem[] = (statement.salesLineItems ?? []).map((item) => ({
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Link href="/farm" className="text-sm text-brand-600 hover:underline">
          ← Back to My Farm
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Financial Statement</h1>
        <p className="text-gray-500">Overview of your farm products and marketplace activity</p>
      </div>

      {/* Statement header */}
      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">ANI Exchange</p>
            <h2 className="text-xl font-bold text-brand-900">{statement.farmName}</h2>
            <p className="text-brand-700">{statement.farmerName}</p>
            <p className="text-sm text-gray-500">{statement.email}</p>
            <CountryBadge country={statement.country} region={statement.region} className="mt-2" />
          </div>
          <div className="text-left sm:text-right text-sm text-gray-500">
            <p>Statement generated</p>
            <p className="font-medium text-brand-900">{formatDate(statement.generatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Listed inventory value</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{formatGhc(summary.totalListedValue)}</p>
          <p className="text-xs text-gray-500">{summary.activeListings} active product(s)</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Sales revenue</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{formatGhc(summary.totalSalesRevenue ?? 0)}</p>
          <p className="text-xs text-gray-500">{summary.totalSalesCount ?? 0} completed sale(s)</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Sold inventory value</p>
          <p className="mt-1 text-2xl font-bold text-brand-800">{formatGhc(summary.totalSoldValue)}</p>
          <p className="text-xs text-gray-500">{summary.soldListings} sold out</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Buyer connections</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{summary.acceptedConnections}</p>
          <p className="text-xs text-gray-500">{summary.pendingConnections} pending</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Total products</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{summary.totalProducts}</p>
          <p className="text-xs text-gray-500">All time on your farm</p>
        </div>
      </div>

      {/* Sales table */}
      {(statement.salesLineItems?.length ?? 0) > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green-100 bg-green-50/50 px-6 py-4">
            <div>
              <h3 className="font-bold text-brand-900">Sales & payments received</h3>
              <p className="text-sm text-gray-500">Buyer purchases with contact details</p>
            </div>
            <Link href="/farm/orders" className="text-sm font-semibold text-brand-700 hover:underline">
              View all orders →
            </Link>
          </div>
          <SalesOrdersTable items={salesOrders} />
          <div className="border-t border-green-100 bg-green-50 px-6 py-3 text-right text-sm font-semibold text-green-800">
            Total sales revenue: {formatGhc(summary.totalSalesRevenue ?? 0)}
          </div>
        </div>
      )}

      {/* Line items table */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 px-6 py-4">
          <h3 className="font-bold text-brand-900">Product line items</h3>
          <p className="text-sm text-gray-500">Each row is a product you listed on the marketplace</p>
        </div>

        {statement.lineItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No products listed yet.{" "}
            <Link href="/farm" className="font-semibold text-brand-700 underline">
              Add a product
            </Link>{" "}
            to see it here.
          </div>
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
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDate(item.date)}</td>
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
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyle(item.status)}`}>
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-50 font-semibold text-brand-900">
                  <td colSpan={5} className="px-6 py-4 text-right">
                    Active inventory total
                  </td>
                  <td className="px-4 py-4 text-right">{formatGhc(summary.totalListedValue)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Sales revenue reflects confirmed buyer payments. Inventory values reflect current listed stock.
      </p>
    </div>
  );
}
