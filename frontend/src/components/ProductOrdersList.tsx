"use client";

import { useEffect, useState } from "react";
import { ProductImage, ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { OrderTrackControls, OrderTrackTimeline } from "@/components/OrderTrackTimeline";
import { api } from "@/lib/api";
import {
  formatDate,
  formatGhc,
  escrowStatusLabel,
  escrowStatusStyle,
  orderStatusStyle,
} from "@/lib/format";
import { OrderTrackStage } from "@/lib/orderTrack";
import { BuyerOrderLineItem, formatListingUnit, ProductOrderLineItem } from "@/lib/types";
import { Icon } from "@/components/icons";

export type OrderListPerspective = "farmer" | "buyer";
type OrderListItem = ProductOrderLineItem | BuyerOrderLineItem;

function isBuyerOrder(order: OrderListItem): order is BuyerOrderLineItem {
  return "farmerName" in order;
}

function orderStatementId(order: OrderListItem): string | null {
  return order.orderId ?? null;
}

function OrderEscrowPanel({
  order,
  perspective,
  onUpdated,
}: {
  order: OrderListItem;
  perspective: OrderListPerspective;
  onUpdated?: (updated: Partial<OrderListItem>) => void;
}) {
  const [otp, setOtp] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const statementId = orderStatementId(order);
  const escrowStatus = order.escrowStatus ?? "HELD";
  const canRelease = perspective === "buyer" && order.canRelease && escrowStatus === "HELD";

  const downloadStatement = async () => {
    if (!statementId) return;
    setDownloading(true);
    setError("");
    try {
      await api.orders.statement(statementId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download statement");
    } finally {
      setDownloading(false);
    }
  };

  const releasePayment = async () => {
    if (!statementId || !/^\d{4}$/.test(otp)) {
      setError("Enter your 4-digit release code");
      return;
    }
    setReleasing(true);
    setError("");
    setSuccess("");
    try {
      const result = await api.orders.release(statementId, otp);
      setSuccess("Payment released to ANI Accountant.");
      setOtp("");
      onUpdated?.({
        escrowStatus: result.escrowStatus,
        otpVerifiedAt: result.otpVerifiedAt,
        paymentReleasedAt: result.paymentReleasedAt,
        canRelease: false,
        releaseOtp: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Release failed");
    } finally {
      setReleasing(false);
    }
  };

  if (!statementId && !order.escrowStatus) return null;

  return (
    <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment trust</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${escrowStatusStyle(escrowStatus)}`}
        >
          {escrowStatusLabel(escrowStatus)}
        </span>
      </div>

      {order.paymentReleasedAt && (
        <p className="mt-2 text-xs text-gray-600">
          Released {formatDate(order.paymentReleasedAt)}
        </p>
      )}

      {canRelease && order.releaseOtp && (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-brand-900">
          Your release code:{" "}
          <span className="font-mono text-lg font-bold tracking-widest text-brand-700">
            {order.releaseOtp}
          </span>
        </p>
      )}

      {canRelease && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-600">
            Enter your 4-digit code after you receive your order to release payment to the ANI
            Accountant.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-center font-mono text-lg tracking-widest focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              aria-label="4-digit release code"
            />
            <button
              type="button"
              onClick={releasePayment}
              disabled={releasing || otp.length !== 4}
              className="btn-primary flex-1 py-2 disabled:opacity-50"
            >
              {releasing ? "Confirming…" : "Confirm delivery"}
            </button>
          </div>
        </div>
      )}

      {statementId && (
        (escrowStatus === "RELEASED" || Boolean(order.otpVerifiedAt)) ? (
          <button
            type="button"
            onClick={downloadStatement}
            disabled={downloading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-50 shadow-sm"
          >
            <Icon name="download" className="h-4 w-4 text-brand-600" />
            {downloading ? "Preparing PDF…" : "Download financial statement (PDF)"}
          </button>
        ) : (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-800">
              <Icon name="lock" className="h-3.5 w-3.5" />
              <span>Financial statement (PDF) locked</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-700">
              PDF download will be enabled once delivery is confirmed via OTP code.
            </p>
          </div>
        )
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-2 text-xs text-green-700">{success}</p>}
    </div>
  );
}


export function ProductOrdersList({
  orders: initialOrders,
  perspective = "farmer",
  trackEditable = false,
  handlerOwnerId,
  emptyMessage,
  emptyAction,
}: {
  orders: OrderListItem[];
  perspective?: OrderListPerspective;
  trackEditable?: boolean;
  handlerOwnerId?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [selected, setSelected] = useState<OrderListItem | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/20 px-6 py-12 text-center text-gray-500">
        {emptyMessage ?? "No orders yet."}
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <CompactOrderCard key={order.id} order={order} onView={() => setSelected(order)} />
        ))}
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          perspective={perspective}
          trackEditable={trackEditable}
          handlerOwnerId={handlerOwnerId}
          onClose={() => setSelected(null)}
          onTrackUpdated={(updated) => {
            setOrders((prev) =>
              prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
            );
            setSelected((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
          }}
        />
      )}
    </>
  );
}

function CompactOrderCard({
  order,
  onView,
}: {
  order: OrderListItem;
  onView: () => void;
}) {
  const isServed = order.trackStage === "DELIVERED" || order.escrowStatus === "RELEASED";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-brand-50 bg-brand-50/40 px-4 py-2.5">
        <span className="text-xs font-semibold text-gray-500">{formatDate(order.date)}</span>
        {isServed ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            ✅ Served
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            ⏳ Unserved
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 p-4">
        {order.productImage ? (
          <ProductImage
            src={order.productImage}
            alt={order.productName}
            className="h-28 w-28 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <Icon name="wheat" className="h-9 w-9 text-brand-300" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-base font-bold leading-snug text-brand-900">
            {order.productName}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {order.quantity} {formatListingUnit(order.unit)}
          </p>
          <p className="mt-1.5 text-base font-bold text-green-700">{formatGhc(order.totalAmount)}</p>
        </div>
      </div>

      <div className="border-t border-brand-50 px-4 pb-4 pt-3">
        <button type="button" onClick={onView} className="btn-primary w-full py-2.5">
          View order
        </button>
      </div>
    </article>
  );
}

function OrderDetailModal({
  order,
  perspective,
  trackEditable,
  handlerOwnerId,
  onClose,
  onTrackUpdated,
}: {
  order: OrderListItem;
  perspective: OrderListPerspective;
  trackEditable?: boolean;
  handlerOwnerId?: string;
  onClose: () => void;
  onTrackUpdated?: (updated: OrderListItem) => void;
}) {
  const [updatingTrack, setUpdatingTrack] = useState(false);
  const [trackError, setTrackError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const advanceTrack = async (nextStage: OrderTrackStage) => {
    if (!order.buyerId || !order.listingId) return;
    setUpdatingTrack(true);
    setTrackError("");
    try {
      const updated = handlerOwnerId
        ? await api.agents.updateClientOrderTrack(handlerOwnerId, {
            buyerId: order.buyerId,
            listingId: order.listingId,
            trackStage: nextStage,
          })
        : await api.farm.updateOrderTrack({
            buyerId: order.buyerId,
            listingId: order.listingId,
            trackStage: nextStage,
          });
      onTrackUpdated?.({ ...order, ...updated });
    } catch (e) {
      setTrackError(e instanceof Error ? e.message : "Could not update tracking");
    } finally {
      setUpdatingTrack(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-100 px-5 py-4">
          <h2 id="order-modal-title" className="text-lg font-bold text-brand-900">
            Order details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="p-5">
          <div className="flex gap-4">
            {order.productImage ? (
              <ProductImage
                src={order.productImage}
                alt={order.productName}
                className="h-32 w-32 shrink-0 rounded-xl object-cover sm:h-36 sm:w-36"
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-brand-50 sm:h-36 sm:w-36">
                <Icon name="wheat" className="h-12 w-12 text-brand-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-brand-900">{order.productName}</p>
              <p className="text-sm text-gray-600">
                {order.commodity} · {order.category}
              </p>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${orderStatusStyle(order.status)}`}
              >
                {order.status.toLowerCase()}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/30 p-4">
            <OrderTrackTimeline stage={order.trackStage} />
            {trackEditable && perspective === "farmer" && (
              <>
                <OrderTrackControls
                  stage={order.trackStage}
                  updating={updatingTrack}
                  onAdvance={advanceTrack}
                />
                {trackError && <p className="mt-2 text-xs text-red-600">{trackError}</p>}
              </>
            )}
            {!trackEditable && perspective === "buyer" && (
              <p className="mt-3 text-center text-xs text-gray-500">
                {order.trackUpdatedAt
                  ? `Last updated ${formatDate(order.trackUpdatedAt)}`
                  : "Your farmer will update progress as your order moves forward"}
              </p>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-500">Quantity</p>
              <p className="font-semibold text-brand-900">
                {order.quantity} {formatListingUnit(order.unit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-500">Total price</p>
              <p className="font-bold text-green-700">{formatGhc(order.totalAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-500">Unit price</p>
              <p className="font-semibold text-brand-900">{formatGhc(order.unitPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-500">Payment</p>
              <p className="capitalize font-medium text-gray-800">
                {order.paymentMethod.replace("_", " ")}
              </p>
            </div>
          </div>

          <OrderEscrowPanel
            order={order}
            perspective={perspective}
            onUpdated={(updated) => onTrackUpdated?.({ ...order, ...updated })}
          />

          <div className="mt-5 rounded-xl border border-brand-100 p-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">From (Buyer)</p>
              <div className="flex items-center gap-3">
                <ProfilePhoto
                  src={!isBuyerOrder(order) ? order.buyerProfilePicture : undefined}
                  name={!isBuyerOrder(order) ? (order.buyerName ?? "Buyer") : "Buyer"}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brand-900">
                    {!isBuyerOrder(order) ? (order.buyerName ?? "Buyer") : "Buyer"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Location: {!isBuyerOrder(order) ? (order.buyerLocation ?? "—") : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-brand-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">To (Farmer)</p>
              <div className="flex items-center gap-3">
                <ProfilePhoto
                  src={isBuyerOrder(order) ? order.farmerProfilePicture : undefined}
                  name={isBuyerOrder(order) ? order.farmerName : "Farmer"}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brand-900">
                    {isBuyerOrder(order)
                      ? `${order.farmerName}${order.farmName ? ` (${order.farmName})` : ""}`
                      : "Farmer / My Farm"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Location: {isBuyerOrder(order) ? order.farmerLocation : (order.productLocation ?? "—")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            {formatDate(order.date)}
            {(order.purchaseCount ?? 1) > 1 && (
              <span className="text-brand-700"> · {order.purchaseCount} purchases combined</span>
            )}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

export function SalesOrdersTable({ items }: { items: ProductOrderLineItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-600">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Buyer</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-brand-50 hover:bg-green-50/20">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.productImage ? (
                    <ProductImage
                      src={item.productImage}
                      alt={item.productName}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                      <Icon name="wheat" className="h-6 w-6 text-brand-300" />
                    </div>
                  )}
                  <span className="font-medium text-brand-900">{item.productName}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProfilePhoto src={item.buyerProfilePicture} name={item.buyerName} size={40} />
                  <span className="font-medium text-gray-900">{item.buyerName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-700">{item.buyerLocation}</td>
              <td className="px-4 py-3 text-right text-gray-800">
                {item.quantity} {formatListingUnit(item.unit)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-green-700">
                {formatGhc(item.totalAmount)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                {formatDate(item.date)}
                {(item.purchaseCount ?? 1) > 1 && (
                  <span className="block text-[10px] text-brand-700">
                    {item.purchaseCount} purchases combined
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
