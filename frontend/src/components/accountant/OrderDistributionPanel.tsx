"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatGhc } from "@/lib/format";
import type { OrderDistributionLine, OrderMoneyDistributionSnapshot } from "@/lib/types";
import { DistributionSplitBreakdown } from "@/components/accountant/DistributionSplitBreakdown";
import { PaymentResultOverlay } from "@/components/PaymentResultOverlay";
import { PdfViewerModal } from "@/components/PdfViewerModal";

interface OrderDistributionPanelProps {
  orderId: string;
  orderLabel: string;
  amount: number;
  distributingKeys: Set<string>;
  onDistributingChange: (key: string, active: boolean) => void;
}

function distributionKey(orderId: string, suffix: string) {
  return `${orderId}:${suffix}`;
}

function lineStatusStyle(status: string) {
  return status === "DISTRIBUTED"
    ? "bg-green-50 text-green-700"
    : "bg-amber-50 text-amber-800";
}

function recipientDisplayLabel(line: OrderDistributionLine, farmerName: string): string {
  switch (line.role) {
    case "FARMER":
      return farmerName;
    case "FARMER_HANDLER":
    case "BUYER_HANDLER":
      return line.recipientName;
    default:
      return line.roleLabel;
  }
}

type DistributionPaymentResult = {
  title: string;
  message: string;
  hint?: string;
};

export function OrderDistributionPanel({
  orderId,
  orderLabel,
  amount,
  distributingKeys,
  onDistributingChange,
}: OrderDistributionPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [snapshot, setSnapshot] = useState<OrderMoneyDistributionSnapshot | null>(null);
  const [pdfLine, setPdfLine] = useState<OrderDistributionLine | null>(null);
  const [paymentResult, setPaymentResult] = useState<DistributionPaymentResult | null>(null);

  const orderPrefix = `${orderId}:`;
  const isOrderBusy = useMemo(
    () => [...distributingKeys].some((key) => key.startsWith(orderPrefix)),
    [distributingKeys, orderPrefix]
  );

  const isDistributing = (suffix: string) =>
    distributingKeys.has(distributionKey(orderId, suffix));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.accountant.getOrderDistribution(orderId);
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load distribution");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && !snapshot && !loading) {
      void load();
    }
  }, [open, snapshot, loading, load]);

  const distributeLine = async (lineId: string) => {
    const key = distributionKey(orderId, lineId);
    const line = snapshot?.lines.find((entry) => entry.id === lineId);
    onDistributingChange(key, true);
    setError("");
    try {
      const data = await api.accountant.distributeOrderLine(orderId, lineId, {
        paymentMethod: paymentMethod.trim() || "Bank transfer",
      });
      setSnapshot(data);
      const distributedLine = data.lines.find((entry) => entry.id === lineId) ?? line;
      if (distributedLine) {
        const recipient = recipientDisplayLabel(
          distributedLine,
          data.farmerName.split(" ")[0] ?? "Fellow"
        );
        setPaymentResult({
          title: "Payment sent",
          message: `${formatGhc(distributedLine.amount)} sent to ${recipient}.`,
          hint: `Order ${orderLabel} · ${paymentMethod.trim() || "Bank transfer"}`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      onDistributingChange(key, false);
    }
  };

  const distributeAll = async () => {
    const key = distributionKey(orderId, "all");
    onDistributingChange(key, true);
    setError("");
    try {
      const data = await api.accountant.distributeOrderAll(orderId, {
        paymentMethod: paymentMethod.trim() || "Bank transfer",
      });
      setSnapshot(data);
      const paidLines = data.lines.filter(
        (line) => line.role !== "ANI_PLATFORM" && line.status === "DISTRIBUTED"
      );
      const paidTotal = paidLines.reduce((sum, line) => sum + line.amount, 0);
      setPaymentResult({
        title: "Distribution complete",
        message: `${paidLines.length} recipient share${paidLines.length === 1 ? "" : "s"} (${formatGhc(paidTotal)}) sent for "${orderLabel}".`,
        hint: data.allDistributed
          ? "All assigned recipients have been paid. ANI platform share is retained automatically."
          : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      onDistributingChange(key, false);
    }
  };

  const loadMessagePdf = useCallback(async () => {
    if (!pdfLine) throw new Error("No message selected");
    return api.accountant.distributionMessagePdfUrl(orderId, pdfLine.id);
  }, [orderId, pdfLine]);

  const openMessagePdf = (line: OrderDistributionLine) => {
    setPdfLine(line);
  };

  const closeMessagePdf = () => {
    setPdfLine(null);
  };

  const fellowFirstName = snapshot?.farmerName.split(" ")[0] ?? "Fellow";

  return (
    <div className="relative rounded-xl border border-brand-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-brand-50/50"
      >
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-brand-900">{orderLabel}</p>
          <p className="mt-0.5 text-sm font-medium text-brand-800">
            Order {orderId.slice(0, 8)}… · {formatGhc(amount)}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-brand-700">
          {open ? "Hide" : "Distribute"}
        </span>
      </button>

      {open && (
        <div className="border-t border-brand-100 px-4 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          {loading && !snapshot ? (
            <p className="text-xs text-gray-500">Loading distribution breakdown…</p>
          ) : snapshot ? (
            <>
              <DistributionSplitBreakdown
                fellowName={fellowFirstName}
                orderAmount={snapshot.totalAmount}
                hidePlatformShare
                className="mb-4 max-w-md rounded-lg bg-brand-50/50 px-3 py-2.5"
              />

              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <label htmlFor={`pay-${orderId}`} className="text-[10px] font-semibold uppercase text-gray-500">
                    Payment method
                  </label>
                  <input
                    id={`pay-${orderId}`}
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={isOrderBusy || snapshot.allDistributed}
                  onClick={() => void distributeAll()}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {isDistributing("all") ? "Distributing…" : "Distribute all"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-xs">
                  <thead>
                    <tr className="border-b border-brand-50 text-left text-[10px] font-semibold uppercase text-gray-500">
                      <th className="py-2 pr-3">Recipient</th>
                      <th className="px-3 py-2 text-right">Share</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="py-2 pl-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.lines
                      .filter((line) => line.role !== "ANI_PLATFORM")
                      .map((line) => {
                      return (
                        <tr key={line.id} className="border-b border-brand-50">
                          <td className="py-2.5 pr-3">
                            <p className="font-semibold text-brand-900">
                              {recipientDisplayLabel(line, fellowFirstName)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {line.percentage > 0 ? `${line.percentage.toFixed(2)}%` : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-brand-900">
                            {formatGhc(line.amount)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${lineStatusStyle(line.status)}`}
                            >
                              {line.status.toLowerCase()}
                            </span>
                          </td>
                          <td className="py-2.5 pl-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {line.canDistribute && line.status !== "DISTRIBUTED" ? (
                                <button
                                  type="button"
                                  disabled={isOrderBusy}
                                  onClick={() => void distributeLine(line.id)}
                                  className="rounded bg-brand-700 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                                >
                                  {isDistributing(line.id) ? "Sending…" : "Distribute"}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openMessagePdf(line)}
                                className="rounded border border-brand-200 px-2.5 py-1 text-[10px] font-semibold text-brand-700 hover:bg-brand-50"
                              >
                                View message
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      <PdfViewerModal
        title={
          pdfLine
            ? `Distribution message - ${recipientDisplayLabel(pdfLine, fellowFirstName)}`
            : "Distribution message"
        }
        open={pdfLine !== null}
        onClose={closeMessagePdf}
        loadUrl={loadMessagePdf}
        allowDownload
      />

      {paymentResult && (
        <PaymentResultOverlay
          variant="success"
          compact
          title={paymentResult.title}
          message={paymentResult.message}
          hint={paymentResult.hint}
          onDismiss={() => setPaymentResult(null)}
          dismissLabel="Close"
        />
      )}
    </div>
  );
}
