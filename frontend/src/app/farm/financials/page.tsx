"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import {
  FarmerPendingDistribution,
  FinancialStatement,
  ProductOrderLineItem,
  isFarmer,
} from "@/lib/types";
import { formatDate, formatGhc, orderStatusStyle } from "@/lib/format";
import { OrderDetailModal, SalesOrdersTable } from "@/components/ProductOrdersList";

type FarmerOrderLineItem = ProductOrderLineItem & { orderId?: string };

function findFarmerOrder(
  orders: FarmerOrderLineItem[],
  orderId: string | undefined
): FarmerOrderLineItem | null {
  if (!orderId) return null;
  return (
    orders.find((o) => o.orderId === orderId || o.id === orderId) ?? null
  );
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
  const [selectedOrder, setSelectedOrder] = useState<FarmerOrderLineItem | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [orderLoadError, setOrderLoadError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isFarmer(user.roleId)) {
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

  async function openOrderModal(item: FarmerPendingDistribution) {
    if (!item.orderId) {
      setOrderLoadError("Order details are not available for this payment.");
      return;
    }
    setLoadingOrderId(item.id);
    setOrderLoadError("");
    try {
      const orders = (await api.farm.orders()) as FarmerOrderLineItem[];
      const match = findFarmerOrder(orders, item.orderId);
      if (!match) {
        setOrderLoadError("Could not load order details. Try again from the orders page.");
        return;
      }
      setSelectedOrder(match);
    } catch (e) {
      setOrderLoadError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoadingOrderId(null);
    }
  }

  function closeOrderModal() {
    setSelectedOrder(null);
  }

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
  const pendingRows = statement.pendingDistributions ?? [];
  const salesOrders: ProductOrderLineItem[] = (statement.salesLineItems ?? []).map((item) => ({
    id: item.id,
    date: typeof item.date === "string" ? item.date : String(item.date),
    productName: item.productName ?? item.title,
    orderName: item.orderName ?? item.productName ?? item.title,
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
    buyerName: item.buyerName ?? "-",
    buyerEmail: item.buyerEmail,
    buyerPhone: item.buyerPhone ?? "-",
    buyerLocation: item.buyerLocation ?? "-",
    buyerCountry: item.buyerCountry,
    buyerProfilePicture: item.buyerProfilePicture,
    purchaseCount: item.purchaseCount,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Link href="/farm" className="text-sm text-brand-600 hover:underline">
          Back to My Production
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">Money Summary</h1>
        <p className="text-sm text-gray-500">What you have listed, sold, and earned</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Products for sale"
          value={formatGhc(summary.totalListedValue)}
          sub={`${summary.activeListings} active product(s)`}
        />
        <SummaryCard
          label="Total earned"
          value={formatGhc(summary.totalSalesRevenue ?? 0)}
          sub={`${summary.totalSalesCount ?? 0} distributed payment(s)`}
          accent="green"
        />
        <SummaryCard
          label="Pending distribution"
          value={formatGhc(summary.pendingDistributionTotal ?? 0)}
          sub={`${summary.pendingDistributionCount ?? 0} awaiting accountant payout`}
          accent="amber"
        />
        <SummaryCard
          label="All products"
          value={String(summary.totalProducts)}
          sub="Listed on your farm"
        />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/40 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-900">Undistributed payments</h3>
        </div>

        {pendingRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No pending payments. Amounts appear here after an order is released and before the
            accountant distributes your share.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-amber-50 bg-amber-50/50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-3">Order</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Share amount</th>
                  <th className="px-4 py-3">Order date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map((item) => (
                  <tr key={item.id} className="border-b border-amber-50 hover:bg-amber-50/30">
                    <td className="px-6 py-3 font-medium text-brand-900">{item.orderName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.buyerName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">
                      {formatGhc(item.shareAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${orderStatusStyle(item.status)}`}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        onClick={() => openOrderModal(item)}
                        disabled={loadingOrderId === item.id}
                        className="font-semibold text-brand-700 hover:underline disabled:opacity-50"
                      >
                        {loadingOrderId === item.id ? "Loading…" : "View order"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(statement.salesLineItems?.length ?? 0) > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green-100 bg-green-50/50 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-brand-900">Payments received</h3>
              <p className="text-sm text-gray-500">
                Funds distributed by ANI Accountant after successful delivery
              </p>
            </div>
            <Link href="/farm/orders" className="text-sm font-semibold text-brand-700 hover:underline">
              View all orders
            </Link>
          </div>
          <SalesOrdersTable items={salesOrders} />
          <div className="border-t border-green-100 bg-green-50 px-6 py-3 text-right text-sm font-semibold text-green-800">
            Total earned: {formatGhc(summary.totalSalesRevenue ?? 0)}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-900">Your products</h3>
          <p className="text-sm text-gray-500">Everything you have listed for sale</p>
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
                    Total listed value
                  </td>
                  <td className="px-4 py-4 text-right">{formatGhc(summary.totalListedValue)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {orderLoadError && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{orderLoadError}</p>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          perspective="farmer"
          trackEditable
          onClose={closeOrderModal}
          onTrackUpdated={(updated) => {
            setSelectedOrder((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
        />
      )}

      <p className="mt-4 text-xs text-gray-400 text-center">
        Totals show payments distributed by ANI Accountant. Listed values reflect products currently for sale.
      </p>
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
  accent?: "green" | "amber";
}) {
  return (
    <div className="min-h-28 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p
        className={`mt-2 text-xl font-bold ${
          accent === "green"
            ? "text-green-700"
            : accent === "amber"
              ? "text-amber-700"
              : "text-brand-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </div>
  );
}
