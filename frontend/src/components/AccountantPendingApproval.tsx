"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { PLATFORM_ACCOUNTANT_LABEL } from "@/lib/site";

type AccountantPendingApprovalProps = {
  status: string;
};

export function AccountantPendingApproval({ status }: AccountantPendingApprovalProps) {
  const rejected = status === "REJECTED";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <div
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${
          rejected ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        <Icon name={rejected ? "x" : "clock"} className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">
        {rejected ? "Registration not approved" : "Awaiting admin approval"}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base">
        {rejected
          ? `Your ${PLATFORM_ACCOUNTANT_LABEL} registration was reviewed and not approved. Contact a platform administrator if you believe this was a mistake.`
          : `Your ${PLATFORM_ACCOUNTANT_LABEL} account has been created. A platform administrator must approve your registration before you can access the financial portal.`}
      </p>
      {!rejected && (
        <p className="mt-2 text-sm text-gray-500">
          You can sign in anytime to check your status. We&apos;ll notify you once access is granted.
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Back to dashboard
        </Link>
        <Link
          href="/profile"
          className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          View profile
        </Link>
      </div>
    </div>
  );
}
