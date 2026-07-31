import Link from "next/link";
import { AnimatedStat } from "@/components/AnimatedStat";
import { aniPlatformSharePercentOfTotal } from "@/lib/handlerDisplayName";
import { formatGhc } from "@/lib/format";

interface AdminPlatformIncomeCardProps {
  totalPlatformIncome: number;
  accessIncome: number;
  orderShareIncome: number;
  accessPaymentCount: number;
  orderShareCount: number;
  animationDelay?: number;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AdminPlatformIncomeCard({
  totalPlatformIncome,
  accessIncome,
  orderShareIncome,
  accessPaymentCount,
  orderShareCount,
  animationDelay = 0,
}: AdminPlatformIncomeCardProps) {
  return (
    <div className="card-elevated overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-emerald-50/40">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-100/80 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">ANI</p>
          <h2 className="mt-0.5 text-lg font-bold text-brand-900">Platform income</h2>
          <p className="mt-1 text-xs text-gray-500">
            Access fees and order-share remainder from released distributions
          </p>
        </div>
        <Link
          href="/admin/financials"
          className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50"
        >
          Financial statement
        </Link>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <AnimatedStat
          value={formatMoney(totalPlatformIncome)}
          prefix="GHC "
          delay={animationDelay}
          className="block text-3xl font-bold tabular-nums text-green-700 sm:text-4xl"
        />
        <p className="mt-1 text-xs text-gray-500">Total platform money</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-brand-100 bg-white/90 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Access income</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-brand-900">{formatGhc(accessIncome)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {accessPaymentCount} access payment{accessPaymentCount === 1 ? "" : "s"} · farm & publication fees
            </p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-white/90 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Order share</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-brand-900">{formatGhc(orderShareIncome)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {orderShareCount} released order{orderShareCount === 1 ? "" : "s"} · ~
              {aniPlatformSharePercentOfTotal(100).toFixed(2)}% each
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
