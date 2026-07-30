"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isAccountant, type PlatformFinancialStatement } from "@/lib/types";
import { OrderReceiptsTable } from "@/components/accountant/PlatformTransactionsTable";
import { PdfViewerModal } from "@/components/PdfViewerModal";

export default function AccountantReceiptsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statement, setStatement] = useState<PlatformFinancialStatement | null>(null);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);

  const loadStatementPdf = useCallback(async () => {
    if (!openingId) throw new Error("No statement selected");
    return api.orders.statementUrl(openingId);
  }, [openingId]);

  const openOrderStatement = (orderId: string) => {
    setError("");
    setOpeningId(orderId);
    setPdfTitle(`Order statement ${orderId.slice(0, 8)}…`);
    setPdfOpen(true);
  };

  const closePdf = () => {
    setPdfOpen(false);
    setOpeningId(null);
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isAccountant(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user) {
      api.accountant
        .financialStatement()
        .then(setStatement)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    }
  }, [user?.id, loading, router]);

  if (loading || !user) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading...</div>;
  }

  const lockedCount =
    statement?.lineItems.filter(
      (item) =>
        item.type === "PRODUCT_ORDER" &&
        item.escrowStatus !== "RELEASED" &&
        !("otpVerifiedAt" in item && item.otpVerifiedAt)
    ).length ?? 0;

  const unlockedCount =
    statement?.lineItems.filter(
      (item) =>
        item.type === "PRODUCT_ORDER" &&
        (item.escrowStatus === "RELEASED" || Boolean("otpVerifiedAt" in item && item.otpVerifiedAt))
    ).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/accountant" className="text-xs text-brand-600 hover:underline">
          Financial Overview
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Order Receipts</h1>
        <p className="text-xs text-gray-500">
          Order-share section — view buyer release / order financial statement PDFs
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-xs text-red-700">{error}</p>
      )}

      {statement && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase text-green-700">Unlocked receipts</p>
            <p className="mt-1 text-2xl font-bold text-green-800">{unlockedCount}</p>
            <p className="text-xs text-green-700">Available to view</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase text-amber-700">Locked receipts</p>
            <p className="mt-1 text-2xl font-bold text-amber-800">{lockedCount}</p>
            <p className="text-xs text-amber-700">Awaiting delivery confirmation</p>
          </div>
        </div>
      )}

      {!statement ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading receipts...</div>
      ) : (
        <OrderReceiptsTable
          statement={statement}
          onOpenStatement={openOrderStatement}
          openingId={pdfOpen ? openingId : null}
        />
      )}

      <PdfViewerModal
        title={pdfTitle}
        open={pdfOpen}
        onClose={closePdf}
        loadUrl={loadStatementPdf}
      />
    </div>
  );
}
