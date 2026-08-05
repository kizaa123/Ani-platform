"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandlerPhoneLink } from "@/components/HandlerAssignmentCards";

export function HandlerClientNav({
  ownerId,
  farmName,
  phone,
}: {
  ownerId: string;
  farmName?: string;
  phone?: string | null;
}) {
  const pathname = usePathname();
  const ordersHref = `/agents/farm/${ownerId}/orders`;
  const onOrders = pathname.startsWith(ordersHref);

  return (
    <div className="mb-6">
      <Link href="/dashboard" className="text-sm font-medium text-brand-600 hover:underline">
        Back to dashboard
      </Link>
      {farmName && (
        <p className="mt-2 text-xl font-medium text-gray-700">
          Managing <span className="font-semibold text-brand-800">{farmName}</span>
        </p>
      )}
      {phone !== undefined && (
        <p className="mt-1.5 text-sm text-gray-600">
          Fellow phone: <HandlerPhoneLink phone={phone} />
        </p>
      )}
      {!onOrders && (
        <nav className="mt-4">
          <Link href={ordersHref} className="btn-outline inline-block border-brand-200 px-4 py-2 text-sm font-semibold">
            Client orders
          </Link>
        </nav>
      )}
    </div>
  );
}
