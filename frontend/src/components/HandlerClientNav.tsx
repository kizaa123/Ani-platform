"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HandlerClientNav({
  ownerId,
  farmName,
}: {
  ownerId: string;
  farmName?: string;
}) {
  const pathname = usePathname();
  const ordersHref = `/agents/farm/${ownerId}/orders`;
  const onOrders = pathname.startsWith(ordersHref);

  return (
    <div className="mb-6">
      <Link href="/agents" className="text-sm font-medium text-brand-600 hover:underline">
        Back to Assigned Farmers
      </Link>
      {farmName && (
        <p className="mt-2 text-xl font-medium text-gray-700">
          Managing <span className="font-semibold text-brand-800">{farmName}</span>
        </p>
      )}
      {!onOrders && (
        <nav className="mt-4">
          <Link href={ordersHref} className="btn-outline inline-block border-brand-200 px-4 py-2 text-sm font-semibold">
            Buyer orders
          </Link>
        </nav>
      )}
    </div>
  );
}
