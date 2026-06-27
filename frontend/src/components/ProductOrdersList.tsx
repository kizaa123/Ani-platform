"use client";

import { useEffect, useState } from "react";
import { ProductImage, ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { OrderTrackControls, OrderTrackTimeline } from "@/components/OrderTrackTimeline";
import { api } from "@/lib/api";
import { formatDate, formatGhc, orderStatusStyle } from "@/lib/format";
import { OrderTrackStage } from "@/lib/orderTrack";
import { BuyerOrderLineItem, formatListingUnit, ProductOrderLineItem } from "@/lib/types";

export type OrderListPerspective = "farmer" | "buyer";
type OrderListItem = ProductOrderLineItem | BuyerOrderLineItem;

function isBuyerOrder(order: OrderListItem): order is BuyerOrderLineItem {
  return "farmerName" in order;
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
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
      <div className="flex items-center gap-4 p-4">
        {order.productImage ? (
          <ProductImage
            src={order.productImage}
            alt={order.productName}
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-3xl">
            🌾
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
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

        <div className="p-5">
          <div className="flex gap-4">
            {order.productImage ? (
              <ProductImage
                src={order.productImage}
                alt={order.productName}
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-3xl">
                🌾
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

          <div className="mt-5 rounded-xl border border-brand-100 p-4">
            {perspective === "farmer" && !isBuyerOrder(order) ? (
              <>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Buyer</p>
                <div className="flex items-start gap-4">
                  <ProfilePhoto src={order.buyerProfilePicture} name={order.buyerName} size={64} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-brand-900">{order.buyerName}</p>
                    {order.buyerEmail && (
                      <p className="break-all text-sm text-gray-600">{order.buyerEmail}</p>
                    )}
                    <CountryBadge
                      country={order.buyerCountry}
                      region={order.buyerLocation.split(",")[1]?.trim()}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Phone</p>
                    <a
                      href={`tel:${order.buyerPhone}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {order.buyerPhone}
                    </a>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Location</p>
                    <p className="text-gray-800">{order.buyerLocation}</p>
                  </div>
                </div>
              </>
            ) : isBuyerOrder(order) ? (
              <>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Farmer</p>
                <div className="flex items-start gap-4">
                  <ProfilePhoto
                    src={order.farmerProfilePicture}
                    name={order.farmerName}
                    size={64}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-brand-900">{order.farmerName}</p>
                    {order.farmName && (
                      <p className="text-sm font-medium text-brand-700">{order.farmName}</p>
                    )}
                    {order.farmerEmail && (
                      <p className="break-all text-sm text-gray-600">{order.farmerEmail}</p>
                    )}
                    <CountryBadge
                      country={order.farmerCountry}
                      region={order.farmerLocation.split(",")[1]?.trim()}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Location</p>
                    <p className="text-gray-800">{order.farmerLocation}</p>
                  </div>
                  {order.productLocation && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-gray-500">Product origin</p>
                      <p className="text-gray-800">{order.productLocation}</p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
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
  );
}

export function SalesOrdersTable({ items }: { items: ProductOrderLineItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-600">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Buyer</th>
            <th className="px-4 py-3">Phone</th>
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
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg">
                      🌾
                    </div>
                  )}
                  <span className="font-medium text-brand-900">{item.productName}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProfilePhoto src={item.buyerProfilePicture} name={item.buyerName} size={32} />
                  <span className="font-medium text-gray-900">{item.buyerName}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <a href={`tel:${item.buyerPhone}`} className="font-medium text-brand-700 hover:underline">
                  {item.buyerPhone}
                </a>
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
