"use client";

import { useState } from "react";
import type { PlatformFinancialStatement } from "@/lib/types";
import { formatDate, formatGhc, formatGhcPlain, orderStatusStyle } from "@/lib/format";

type LineItemType = PlatformFinancialStatement["lineItems"][number]["type"];
type FinancialFilter = LineItemType | "ALL";

function typeLabel(type: LineItemType) {
  switch (type) {
    case "PRODUCT_ORDER":
      return "Product order";
    case "FARM_ACCESS":
      return "Farm access payment";
    case "RESEARCH_SALE":
      return "Publication sale (ANI 10%)";
    default:
      return type;
  }
}

function filterLabel(filter: FinancialFilter) {
  switch (filter) {
    case "PRODUCT_ORDER":
      return "Product orders";
    case "FARM_ACCESS":
      return "Farm access payments";
    case "RESEARCH_SALE":
      return "Publication sales (ANI share)";
    default:
      return "All payments";
  }
}

export function PlatformTransactionsTable({
  statement,
  onOpenStatement,
  openingId,
  showStatementColumn = true,
  compact = false,
}: {
  statement: PlatformFinancialStatement;
  onOpenStatement?: (orderId: string) => void;
  openingId?: string | null;
  showStatementColumn?: boolean;
  compact?: boolean;
}) {
  const [activeFilter, setActiveFilter] = useState<FinancialFilter>("ALL");
  const { summary } = statement;

  const toggleFilter = (filter: FinancialFilter) => {
    setActiveFilter((current) => (current === filter ? "ALL" : filter));
  };

  const filteredLineItems =
    activeFilter === "ALL"
      ? statement.lineItems
      : statement.lineItems.filter((item) => item.type === activeFilter);
  const filteredTotal = filteredLineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      {!compact && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Product orders"
            value={formatGhc(summary.productOrderRevenue)}
            sub={`${summary.productOrderCount} sale(s)`}
            active={activeFilter === "PRODUCT_ORDER"}
            onClick={() => toggleFilter("PRODUCT_ORDER")}
          />
          <SummaryCard
            label="Farm access payments"
            value={formatGhc(summary.farmAccessRevenue)}
            sub={`${summary.farmAccessCount} payment(s)`}
            active={activeFilter === "FARM_ACCESS"}
            onClick={() => toggleFilter("FARM_ACCESS")}
          />
          <SummaryCard
            label="Publication share (10%)"
            value={formatGhc(summary.researchRevenue)}
            sub={
              summary.researchGrossSales
                ? `${summary.researchSaleCount} sale(s) · ${formatGhc(summary.researchGrossSales)} gross`
                : `${summary.researchSaleCount} sale(s)`
            }
            active={activeFilter === "RESEARCH_SALE"}
            onClick={() => toggleFilter("RESEARCH_SALE")}
          />
          <SummaryCard
            label="Total earned"
            value={formatGhc(summary.totalRevenue)}
            sub="All payment types"
            active={activeFilter === "ALL"}
            onClick={() => toggleFilter("ALL")}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">{filterLabel(activeFilter)}</h3>
          <p className="text-xs text-gray-500">
            {filteredLineItems.length} transaction(s)
            {activeFilter !== "ALL" ? " - click card again to show all" : ""}
          </p>
        </div>

        {filteredLineItems.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-[10px] font-semibold uppercase text-gray-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Parties</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right">Amount (GHC)</th>
                  <th className="px-5 py-2.5">Status</th>
                  {showStatementColumn && <th className="px-5 py-2.5">Receipt</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLineItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="whitespace-nowrap px-5 py-2.5 text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{typeLabel(item.type)}</td>
                    <td className="px-4 py-2.5 font-medium text-brand-900">{item.description}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.partyName}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-brand-900">
                      {formatGhcPlain(item.amount)}
                      {item.type === "RESEARCH_SALE" && item.grossAmount != null && item.grossAmount !== item.amount ? (
                        <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
                          of {formatGhcPlain(item.grossAmount)} gross
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${orderStatusStyle(item.status)}`}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                    {showStatementColumn && (
                      <td className="px-5 py-2.5">
                        {item.type === "PRODUCT_ORDER" ? (
                          item.escrowStatus === "RELEASED" ||
                          Boolean("otpVerifiedAt" in item && item.otpVerifiedAt) ? (
                            onOpenStatement ? (
                              <button
                                type="button"
                                onClick={() => onOpenStatement(item.id)}
                                disabled={openingId === item.id}
                                className="text-[10px] font-semibold text-brand-700 hover:underline disabled:opacity-50"
                              >
                                {openingId === item.id ? "…" : "View PDF"}
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-green-700">Available</span>
                            )
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700"
                              title="PDF locked until delivery is confirmed"
                            >
                              Locked
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-50 font-semibold text-brand-900">
                  <td colSpan={4} className="px-5 py-3 text-right text-xs">
                    {activeFilter === "ALL" ? "Total" : `${filterLabel(activeFilter)} total`}
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">
                    {formatGhcPlain(activeFilter === "ALL" ? summary.totalRevenue : filteredTotal)}
                  </td>
                  <td colSpan={showStatementColumn ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-3.5 text-left shadow-sm transition-colors ${
        active
          ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-200"
          : "border-brand-100 hover:border-brand-200 hover:bg-brand-50/30"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-brand-900">{value}</p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </button>
  );
}

export function OrderReceiptsTable({
  statement,
  onOpenStatement,
  openingId,
}: {
  statement: PlatformFinancialStatement;
  onOpenStatement: (orderId: string) => void;
  openingId?: string | null;
}) {
  const productOrders = statement.lineItems.filter((item) => item.type === "PRODUCT_ORDER");

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
      <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
        <h3 className="text-sm font-semibold text-brand-900">Order receipts</h3>
        <p className="text-xs text-gray-500">Paid product orders - view or download financial statement PDFs</p>
      </div>

      {productOrders.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-gray-500">No paid product orders yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-[10px] font-semibold uppercase text-gray-500">
                <th className="px-5 py-2.5">Date</th>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Parties</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right">Amount (GHC)</th>
                <th className="px-5 py-2.5">Receipt status</th>
                <th className="px-5 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {productOrders.map((item) => {
                const unlocked =
                  item.escrowStatus === "RELEASED" ||
                  Boolean("otpVerifiedAt" in item && item.otpVerifiedAt);
                return (
                  <tr key={item.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="whitespace-nowrap px-5 py-2.5 text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-2.5 font-medium text-brand-900">{item.description}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.partyName}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-brand-900">
                      {formatGhcPlain(item.amount)}
                      {item.type === "RESEARCH_SALE" && item.grossAmount != null && item.grossAmount !== item.amount ? (
                        <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
                          of {formatGhcPlain(item.grossAmount)} gross
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-2.5">
                      {unlocked ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          Unlocked
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Locked
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => onOpenStatement(item.id)}
                          disabled={openingId === item.id}
                          className="rounded-lg bg-brand-700 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
                        >
                          {openingId === item.id ? "Opening…" : "View / Download PDF"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400">Awaiting delivery release</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
