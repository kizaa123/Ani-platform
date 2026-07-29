"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { fullName, isAccountant, type AccountantOverview, type PlatformFinancialStatement, type PlatformWithdrawal } from "@/lib/types";
import { formatDate, formatGhc } from "@/lib/format";
import { OrderDistributionPanel } from "@/components/accountant/OrderDistributionPanel";
import { DistributionSplitBreakdown } from "@/components/accountant/DistributionSplitBreakdown";
import { AniPlatformShareCard } from "@/components/accountant/AniPlatformShareCard";

function statusStyle(status: PlatformWithdrawal["status"]) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-50 text-green-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default function AccountantWithdrawalsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<AccountantOverview | null>(null);
  const [withdrawals, setWithdrawals] = useState<PlatformWithdrawal[]>([]);
  const [statement, setStatement] = useState<PlatformFinancialStatement | null>(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [distributingKeys, setDistributingKeys] = useState<Set<string>>(() => new Set());

  const setDistributing = useCallback((key: string, active: boolean) => {
    setDistributingKeys((prev) => {
      const next = new Set(prev);
      if (active) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAccountant(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (!user || !isAccountant(user.roleId)) return;

    Promise.all([
      api.accountant.overview(),
      api.accountant.listWithdrawals(),
      api.accountant.financialStatement(),
    ])
      .then(([overviewData, withdrawalRows, statementData]) => {
        setOverview(overviewData);
        setWithdrawals(withdrawalRows);
        setStatement(statementData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load withdrawals"))
      .finally(() => setPageLoading(false));
  }, [user, loading, router]);

  const reloadWithdrawals = () => {
    Promise.all([
      api.accountant.overview(),
      api.accountant.listWithdrawals(),
      api.accountant.financialStatement(),
    ])
      .then(([overviewData, withdrawalRows, statementData]) => {
        setOverview(overviewData);
        setWithdrawals(withdrawalRows);
        setStatement(statementData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load withdrawals"));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid withdrawal amount");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.accountant.createWithdrawal({
        amount: parsed,
        notes: notes.trim() || undefined,
      });
      setAmount("");
      setNotes("");
      reloadWithdrawals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: PlatformWithdrawal["status"]) => {
    setUpdatingId(id);
    setError("");
    try {
      await api.accountant.updateWithdrawal(id, { status });
      reloadWithdrawals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update withdrawal");
    } finally {
      setUpdatingId(null);
    }
  };

  const releasedOrders =
    statement?.lineItems.filter(
      (item) =>
        item.type === "PRODUCT_ORDER" &&
        (item.escrowStatus === "RELEASED" || Boolean(item.otpVerifiedAt))
    ) ?? [];

  if (loading || !user) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/accountant" className="text-xs text-brand-600 hover:underline">
          ← Financial Overview
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Order Shared & Withdrawals</h1>
        <p className="text-xs text-gray-500">
          Distribute released order escrow, track ANI order-share income, and record withdrawals
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-xs text-red-700">{error}</p>
      )}

      {overview && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Available balance</p>
            <p className="mt-1 text-xl font-bold text-brand-900">{formatGhc(overview.availableBalance)}</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Total withdrawn</p>
            <p className="mt-1 text-xl font-bold text-brand-900">{formatGhc(overview.totalWithdrawn)}</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Withdrawal records</p>
            <p className="mt-1 text-xl font-bold text-brand-900">{withdrawals.length}</p>
          </div>
        </div>
      )}

      {releasedOrders.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
          <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-4">
            <h3 className="text-sm font-semibold text-brand-900">Order shared distribution</h3>
            <p className="mt-1 text-xs text-gray-500">
              Split released escrow to Fellow, liaison officers, and ANI order share
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] lg:items-start">
              <DistributionSplitBreakdown hidePlatformShare className="max-w-md" />
              <AniPlatformShareCard orderAmounts={releasedOrders.map((order) => order.amount)} />
            </div>
          </div>
          <div className="space-y-3 p-5">
            {releasedOrders.map((order) => (
              <OrderDistributionPanel
                key={order.id}
                orderId={order.id}
                orderLabel={order.description}
                amount={order.amount}
                distributingKeys={distributingKeys}
                onDistributingChange={setDistributing}
              />
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-bold text-brand-900">Record new withdrawal</h2>
        <p className="mt-1 text-xs text-gray-500">Creates a pending withdrawal for review and completion</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="withdraw-amount" className="text-xs font-semibold text-gray-600">
              Amount (GHC)
            </label>
            <input
              id="withdraw-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label htmlFor="withdraw-notes" className="text-xs font-semibold text-gray-600">
              Notes (optional)
            </label>
            <input
              id="withdraw-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="Bank transfer reference, purpose…"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Recording…" : "Record withdrawal"}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-900">Withdrawal history</h3>
        </div>

        {pageLoading ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">Loading…</div>
        ) : withdrawals.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-500">No withdrawals recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50 text-left text-[10px] font-semibold uppercase text-gray-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Recorded by</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-5 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((row) => (
                  <tr key={row.id} className="border-b border-brand-50 hover:bg-brand-50/30">
                    <td className="whitespace-nowrap px-5 py-2.5 text-gray-600">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand-900">
                      {formatGhc(row.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(row.status)}`}
                      >
                        {row.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {fullName(row.creator)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-2.5 text-gray-500">
                      {row.notes || "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      {row.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingId === row.id}
                            onClick={() => updateStatus(row.id, "COMPLETED")}
                            className="rounded bg-green-700 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === row.id}
                            onClick={() => updateStatus(row.id, "CANCELLED")}
                            className="rounded border border-red-200 px-2.5 py-1 text-[10px] font-semibold text-red-600 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
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
