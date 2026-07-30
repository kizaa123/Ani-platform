"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HandlerBuyerClientNav({
  ownerId,
  buyerName,
}: {
  ownerId: string;
  buyerName?: string;
}) {
  const pathname = usePathname();
  const ordersHref = `/agents/buyer/${ownerId}/orders`;
  const onOrders = pathname.startsWith(ordersHref);

  return (
    <div className="mb-6">
      <Link href="/agents" className="text-sm font-medium text-brand-600 hover:underline">
        Back to Assigned Clients
      </Link>
      {buyerName && (
        <p className="mt-2 text-xl font-medium text-gray-700">
          Managing <span className="font-semibold text-brand-800">{buyerName}</span>
        </p>
      )}
      {!onOrders && (
        <nav className="mt-4">
          <Link
            href={ordersHref}
            className="btn-outline inline-block border-brand-200 px-4 py-2 text-sm font-semibold"
          >
            Orders placed
          </Link>
        </nav>
      )}
    </div>
  );
}
