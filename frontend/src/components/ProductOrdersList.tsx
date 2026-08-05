"use client";

import { useEffect, useState } from "react";
import { ProductImage } from "@/components/FarmerAvatar";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";
import { RolePrefixedName, splitDisplayName } from "@/components/RolePrefixedName";
import { VerificationTags } from "@/components/VerificationTagBadge";
import { OrderTrackControls, OrderTrackTimeline } from "@/components/OrderTrackTimeline";
import { api } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  escrowStatusLabel,
  escrowStatusStyle,
  orderStatusStyle,
} from "@/lib/format";
import { formatOrderAmountForRecipient } from "@/lib/currency";
import { useMoneyFormat } from "@/hooks/useMoneyFormat";
import { useAuth } from "@/context/AuthProvider";
import { OrderTrackStage } from "@/lib/orderTrack";
import { BuyerOrderLineItem, CounterpartHandlerContact, formatListingUnit, ProductOrderLineItem, ROLES } from "@/lib/types";
import { Icon } from "@/components/icons";
import { HandlerPhoneLink } from "@/components/HandlerAssignmentCards";
import { EmailText } from "@/components/EmailText";
import { floDisplayName, cloDisplayName } from "@/lib/handlerDisplayName";

export type OrderListPerspective = "farmer" | "buyer";
type OrderListItem = ProductOrderLineItem | BuyerOrderLineItem;

function isBuyerOrder(order: OrderListItem): order is BuyerOrderLineItem {
  return "farmerName" in order;
}

type OrderMoneyFormatter = (amountGhc: number, order: OrderListItem) => string;

function createOrderMoneyFormatter(
  perspective: OrderListPerspective,
  viewerCountry: string,
  formatLocal: (amountGhc: number) => string
): OrderMoneyFormatter {
  return (amountGhc, order) => {
    if (perspective === "buyer") {
      return formatLocal(amountGhc);
    }
    const buyerCountry = isBuyerOrder(order) ? viewerCountry : (order.buyerCountry ?? "Ghana");
    const farmerCountry = isBuyerOrder(order)
      ? (order.farmerCountry ?? "Ghana")
      : viewerCountry;
    return formatOrderAmountForRecipient(amountGhc, buyerCountry, farmerCountry);
  };
}

function orderListKey(order: OrderListItem): string {
  return order.orderId ?? order.id;
}

function orderReference(order: OrderListItem): string {
  const id = order.orderId ?? order.id;
  return id.slice(0, 8).toUpperCase();
}

function isOrderServed(order: OrderListItem): boolean {
  return order.trackStage === "DELIVERED" || order.escrowStatus === "RELEASED";
}

function CounterpartHandlerSection({
  handler,
  label,
  roleTag,
}: {
  handler: CounterpartHandlerContact;
  label: string;
  roleTag: string;
}) {
  return (
    <div className="mt-5 rounded-xl border-2 border-brand-200 bg-brand-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="users" className="h-4 w-4 shrink-0 text-brand-700" />
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">{label}</p>
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-800">
          {roleTag}
        </span>
      </div>
      <p className="mt-3 text-base font-bold text-brand-900">{handler.name}</p>
      <div className="mt-2 space-y-1 text-sm text-gray-700">
        <p>
          Phone: <HandlerPhoneLink phone={handler.phone} />
        </p>
        {handler.email && (
          <p>
            Email:{" "}
            <EmailText email={handler.email} link className="font-semibold text-brand-800 hover:underline" />
          </p>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Contact your counterpart liaison to coordinate delivery and logistics.
      </p>
    </div>
  );
}

function OrderReleaseSummary({ order }: { order: OrderListItem }) {
  if (!order.otpVerifiedAt && !order.paymentReleasedAt) return null;

  return (
    <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery & release</p>
      <dl className="mt-2 space-y-2 text-sm">
        {order.otpVerifiedAt && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <dt className="text-gray-600">Delivery confirmed</dt>
            <dd className="font-medium text-brand-900">{formatDateTime(order.otpVerifiedAt)}</dd>
          </div>
        )}
        {order.paymentReleasedAt && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <dt className="text-gray-600">Funds released</dt>
            <dd className="font-medium text-brand-900">{formatDateTime(order.paymentReleasedAt)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function OrderEscrowPanel({
  order,
  perspective,
  handlerView = false,
  onUpdated,
}: {
  order: OrderListItem;
  perspective: OrderListPerspective;
  /** Liaison officer (FLO/CLO) viewing a client order - hide buyer-only release OTP UI. */
  handlerView?: boolean;
  onUpdated?: (updated: Partial<OrderListItem>) => void;
}) {
  const [otp, setOtp] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const statementId = order.orderId ?? order.id;
  const escrowStatus = order.escrowStatus ?? "HELD";
  const canRelease =
    !handlerView && perspective === "buyer" && order.canRelease && escrowStatus === "HELD";

  if (handlerView) {
    if (!order.escrowStatus) return null;

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
      </div>
    );
  }

  const openStatement = async () => {
    if (!statementId) return;
    setOpening(true);
    setError("");
    try {
      await api.orders.statement(statementId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download statement");
    } finally {
      setOpening(false);
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
            onClick={openStatement}
            disabled={opening}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-50 shadow-sm"
          >
            <Icon name="download" className="h-4 w-4 text-brand-600" />
            {opening ? "Downloading PDF…" : "Download financial statement (PDF)"}
          </button>
        ) : (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-800">
              <Icon name="lock" className="h-3.5 w-3.5" />
              <span>Financial statement (PDF) locked</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-700">
              PDF will be available once delivery is confirmed via OTP code.
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
  sectionTitle,
}: {
  orders: OrderListItem[];
  perspective?: OrderListPerspective;
  trackEditable?: boolean;
  handlerOwnerId?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  sectionTitle?: string;
}) {
  const { user } = useAuth();
  const { format } = useMoneyFormat();
  const formatOrderMoney = createOrderMoneyFormatter(
    perspective,
    user?.country ?? "Ghana",
    format
  );
  const [orders, setOrders] = useState(initialOrders);
  const [selected, setSelected] = useState<OrderListItem | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  if (orders.length === 0) {
    if (!emptyMessage) return null;
    return (
      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/20 px-6 py-12 text-center text-gray-500">
        {emptyMessage}
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <>
      {sectionTitle && (
        <h2 className="mb-4 text-lg font-bold text-brand-900">{sectionTitle}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <CompactOrderCard
            key={orderListKey(order)}
            order={order}
            onView={() => setSelected(order)}
            formatOrderMoney={formatOrderMoney}
          />
        ))}
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          perspective={perspective}
          trackEditable={trackEditable}
          handlerOwnerId={handlerOwnerId}
          formatOrderMoney={formatOrderMoney}
          onClose={() => setSelected(null)}
          onTrackUpdated={(updated) => {
            const updatedKey = orderListKey(updated);
            setOrders((prev) =>
              prev.map((item) => (orderListKey(item) === updatedKey ? { ...item, ...updated } : item))
            );
            setSelected((prev) =>
              prev && orderListKey(prev) === updatedKey ? { ...prev, ...updated } : prev
            );
          }}
        />
      )}
    </>
  );
}

function CompactOrderCard({
  order,
  onView,
  formatOrderMoney,
}: {
  order: OrderListItem;
  onView: () => void;
  formatOrderMoney: OrderMoneyFormatter;
}) {
  const isServed = isOrderServed(order);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-brand-50 bg-brand-50/40 px-4 py-2.5">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-gray-500">{formatDate(order.date)}</span>
          <p className="text-[10px] font-medium uppercase tracking-wide text-brand-600">
            Order #{orderReference(order)}
          </p>
        </div>
        {isServed ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <Icon name="check-circle" className="h-3.5 w-3.5 shrink-0" />
            <span>Served</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            <Icon name="clock" className="h-3.5 w-3.5 shrink-0" />
            <span>Unserved</span>
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
          <p className="mt-1.5 text-base font-bold text-green-700">
            {formatOrderMoney(order.totalAmount, order)}
          </p>
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

export function OrderDetailModal({
  order,
  perspective,
  trackEditable,
  handlerOwnerId,
  formatOrderMoney: formatOrderMoneyProp,
  onClose,
  onTrackUpdated,
}: {
  order: OrderListItem;
  perspective: OrderListPerspective;
  trackEditable?: boolean;
  handlerOwnerId?: string;
  formatOrderMoney?: OrderMoneyFormatter;
  onClose: () => void;
  onTrackUpdated?: (updated: OrderListItem) => void;
}) {
  const { user } = useAuth();
  const { format } = useMoneyFormat();
  const formatOrderMoney =
    formatOrderMoneyProp ??
    createOrderMoneyFormatter(perspective, user?.country ?? "Ghana", format);
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
    const targetOrderId = order.orderId ?? order.id;
    if (!targetOrderId) return;
    setUpdatingTrack(true);
    setTrackError("");
    try {
      const updated = handlerOwnerId
        ? await api.agents.updateClientOrderTrack(handlerOwnerId, {
            orderId: targetOrderId,
            trackStage: nextStage,
          })
        : await api.farm.updateOrderTrack({
            orderId: targetOrderId,
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-brand-100 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 id="order-modal-title" className="min-w-0 flex-1 truncate text-lg font-bold text-brand-900">
            Order details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            aria-label="Close"
          >
            <Icon name="x" className="h-5 w-5" />
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
                  : "Your fellow will update progress as your order moves forward"}
              </p>
            )}
          </div>

          {handlerOwnerId && order.counterpartHandler && (
            <CounterpartHandlerSection
              handler={order.counterpartHandler}
              label={perspective === "farmer" ? "Client's liaison officer" : "Fellow's liaison officer"}
              roleTag={
                perspective === "farmer"
                  ? cloDisplayName(order.counterpartHandler.firstName)
                  : floDisplayName(order.counterpartHandler.firstName)
              }
            />
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-500">Quantity</p>
              <p className="font-semibold text-brand-900">
                {order.quantity} {formatListingUnit(order.unit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-500">Total price</p>
              <p className="font-bold text-green-700">{formatOrderMoney(order.totalAmount, order)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-500">Unit price</p>
              <p className="font-semibold text-brand-900">{formatOrderMoney(order.unitPrice, order)}</p>
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
            handlerView={Boolean(handlerOwnerId)}
            onUpdated={(updated) => onTrackUpdated?.({ ...order, ...updated })}
          />

          <OrderReleaseSummary order={order} />

          <div className="mt-5 rounded-xl border border-brand-100 p-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">From (Client)</p>
              <div className="flex items-center gap-3">
                <AvatarWithVerification
                  src={!isBuyerOrder(order) ? order.buyerProfilePicture : undefined}
                  name={!isBuyerOrder(order) ? (order.buyerName ?? "Client") : "Client"}
                  size={48}
                  verificationStatus={!isBuyerOrder(order) ? order.buyerVerificationStatus : undefined}
                  verificationTags={!isBuyerOrder(order) ? order.buyerVerificationTags : undefined}
                  tagPlacement="none"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brand-900">
                    {!isBuyerOrder(order) ? (
                      <RolePrefixedName
                        user={{
                          roleId: ROLES.BUYER,
                          ...splitDisplayName(order.buyerName ?? "Client"),
                          verificationStatus: order.buyerVerificationStatus,
                        }}
                        verificationTags={order.buyerVerificationTags}
                        nameClassName="font-bold text-brand-900"
                        prefixClassName="font-bold text-brand-900"
                      />
                    ) : (
                      "Client"
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    Location: {!isBuyerOrder(order) ? (order.buyerLocation ?? "-") : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-brand-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">To (Fellow)</p>
              <div className="flex items-center gap-3">
                <AvatarWithVerification
                  src={isBuyerOrder(order) ? order.farmerProfilePicture : undefined}
                  name={isBuyerOrder(order) ? order.farmerName : "Fellow"}
                  size={48}
                  verificationStatus={isBuyerOrder(order) ? order.farmerVerificationStatus : undefined}
                  verificationTags={isBuyerOrder(order) ? order.farmerVerificationTags : undefined}
                  tagPlacement="none"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brand-900">
                    {isBuyerOrder(order) ? (
                      <span className="inline-flex max-w-full flex-wrap items-center gap-x-0.5 gap-y-0.5">
                        <RolePrefixedName
                          user={{
                            roleId: ROLES.CROP_FARMER,
                            ...splitDisplayName(order.farmerName),
                            verificationStatus: order.farmerVerificationStatus,
                          }}
                          hideVerificationTags
                          nameClassName="font-bold text-brand-900"
                          prefixClassName="font-bold text-brand-900"
                        />
                        {order.farmName && (
                          <span className="font-bold text-brand-900"> ({order.farmName})</span>
                        )}
                        <VerificationTags
                          verificationTags={order.farmerVerificationTags}
                          verificationStatus={order.farmerVerificationStatus}
                          size="sm"
                          className="inline-flex shrink-0"
                        />
                      </span>
                    ) : (
                      "Fellow / My Production"
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    Location: {isBuyerOrder(order) ? order.farmerLocation : (order.productLocation ?? "-")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            {formatDateTime(order.date)} · Order #{orderReference(order)}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

export function BuyerOrdersTable({ items }: { items: BuyerOrderLineItem[] }) {
  const { user } = useAuth();
  const { format } = useMoneyFormat();
  const formatOrderMoney = createOrderMoneyFormatter("buyer", user?.country ?? "Ghana", format);

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-600">
            <th className="px-4 py-3">Picture</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3 text-right">Quantity</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3">Time and date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-brand-50 hover:bg-green-50/20">
              <td className="px-4 py-3">
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
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-brand-900">{item.productName}</span>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{item.farmerName}</p>
                {item.farmName && <p className="text-xs text-brand-700">{item.farmName}</p>}
              </td>
              <td className="px-4 py-3 text-right text-gray-800">
                {item.quantity} {formatListingUnit(item.unit)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-green-700">
                {formatOrderMoney(item.totalAmount, item)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                {formatDateTime(item.date)}
                <span className="block text-[10px] text-brand-700">#{orderReference(item)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalesOrdersTable({ items }: { items: ProductOrderLineItem[] }) {
  const { user } = useAuth();
  const { format } = useMoneyFormat();
  const formatOrderMoney = createOrderMoneyFormatter("farmer", user?.country ?? "Ghana", format);

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-xs font-semibold uppercase text-gray-600">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Client</th>
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
                  <div>
                    <span className="font-medium text-brand-900">
                      {item.orderName ?? item.productName}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{item.buyerName}</td>
              <td className="px-4 py-3 text-gray-700">{item.buyerLocation}</td>
              <td className="px-4 py-3 text-right text-gray-800">
                {item.quantity} {formatListingUnit(item.unit)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-green-700">
                {formatOrderMoney(item.totalAmount, item)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                {formatDate(item.date)}
                <span className="block text-[10px] text-brand-700">#{orderReference(item)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
