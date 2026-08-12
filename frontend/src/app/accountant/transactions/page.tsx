"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { isAccountant, type PlatformFinancialStatement } from "@/lib/types";
import { PlatformTransactionsTable } from "@/components/accountant/PlatformTransactionsTable";
import { formatDate, formatGhc } from "@/lib/format";
import { PLATFORM_NAME } from "@/lib/site";
import { PdfViewerModal } from "@/components/PdfViewerModal";

export default function AccountantTransactionsPage() {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/accountant" className="text-xs text-brand-600 hover:underline">
          Financial Overview
        </Link>
        <h1 className="mt-2 text-xl font-bold text-brand-900">Access Ledger</h1>
        <p className="text-xs text-gray-500">
          Farm access fees, publication access payments, and other access income
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-xs text-red-700">{error}</p>
      )}

      {!statement ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading transactions...</div>
      ) : (
        <>
          <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">{PLATFORM_NAME}</p>
                <h2 className="text-base font-bold text-brand-900">Transaction ledger</h2>
                <p className="text-xs text-gray-500">Generated {formatDate(statement.generatedAt)}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-semibold uppercase text-gray-500">Total received</p>
                <p className="text-2xl font-bold text-green-700">{formatGhc(statement.summary.totalRevenue)}</p>
                <p className="text-xs text-gray-500">{statement.summary.transactionCount} payment(s)</p>
              </div>
            </div>
          </div>

          <PlatformTransactionsTable
            statement={statement}
            onOpenStatement={openOrderStatement}
            openingId={pdfOpen ? openingId : null}
          />
        </>
      )}

      <PdfViewerModal
        title={pdfTitle}
        open={pdfOpen}
        onClose={closePdf}
        loadUrl={loadStatementPdf}
        allowDownload
      />
    </div>
  );
}
