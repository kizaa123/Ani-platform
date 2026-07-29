"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatGhc } from "@/lib/format";
import type { OrderDistributionLine, OrderMoneyDistributionSnapshot } from "@/lib/types";
import { DistributionSplitBreakdown } from "@/components/accountant/DistributionSplitBreakdown";

interface OrderDistributionPanelProps {
  orderId: string;
  orderLabel: string;
  amount: number;
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

function recipientRoleHint(line: OrderDistributionLine): string | null {
  if (line.role === "FARMER_HANDLER") return "Fellow Liaison Officer";
  if (line.role === "BUYER_HANDLER") return "Client Liaison Officer";
  return null;
}

export function OrderDistributionPanel({
  orderId,
  orderLabel,
  amount,
}: OrderDistributionPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [snapshot, setSnapshot] = useState<OrderMoneyDistributionSnapshot | null>(null);

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
    setActing(lineId);
    setError("");
    try {
      const data = await api.accountant.distributeOrderLine(orderId, lineId, {
        paymentMethod: paymentMethod.trim() || "Bank transfer",
      });
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      setActing(null);
    }
  };

  const distributeAll = async () => {
    setActing("all");
    setError("");
    try {
      const data = await api.accountant.distributeOrderAll(orderId, {
        paymentMethod: paymentMethod.trim() || "Bank transfer",
      });
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      setActing(null);
    }
  };

  const fellowFirstName = snapshot?.farmerName.split(" ")[0] ?? "Fellow";

  return (
    <div className="rounded-xl border border-brand-100 bg-white">
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
                  disabled={acting !== null || snapshot.allDistributed}
                  onClick={() => void distributeAll()}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {acting === "all" ? "Distributing…" : "Distribute all"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs">
                  <thead>
                    <tr className="border-b border-brand-50 text-left text-[10px] font-semibold uppercase text-gray-500">
                      <th className="py-2 pr-3">Recipient</th>
                      <th className="px-3 py-2 text-right">Share</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="py-2 pl-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.lines
                      .filter((line) => line.role !== "ANI_PLATFORM")
                      .map((line) => {
                      const roleHint = recipientRoleHint(line);
                      return (
                        <tr key={line.id} className="border-b border-brand-50">
                          <td className="py-2.5 pr-3">
                            <p className="font-semibold text-brand-900">
                              {recipientDisplayLabel(line, fellowFirstName)}
                            </p>
                            {roleHint && (
                              <p className="text-[10px] text-gray-500">{roleHint}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{line.percentage.toFixed(2)}%</td>
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
                            {line.canDistribute && line.status !== "DISTRIBUTED" ? (
                              <button
                                type="button"
                                disabled={acting !== null}
                                onClick={() => void distributeLine(line.id)}
                                className="rounded bg-brand-700 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                              >
                                {acting === line.id ? "Sending…" : "Distribute"}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
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
    </div>
  );
}
