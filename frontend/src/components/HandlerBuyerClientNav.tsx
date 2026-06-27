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
  const base = `/agents/buyer/${ownerId}`;

  const tabs = [
    {
      href: `${base}/orders`,
      label: "Orders placed",
      match: (p: string) => p.startsWith(`${base}/orders`) || p === base,
    },
    {
      href: `${base}/financials`,
      label: "Financial statement",
      match: (p: string) => p.startsWith(`${base}/financials`),
    },
    {
      href: `${base}/connections`,
      label: "Farmer connections",
      match: (p: string) => p.startsWith(`${base}/connections`),
    },
  ];

  return (
    <div className="mb-6">
      <Link href="/agents" className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to My Clients
      </Link>
      {buyerName && (
        <p className="mt-2 text-sm text-gray-500">
          Representing <span className="font-semibold text-brand-800">{buyerName}</span>
        </p>
      )}
      <nav className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-brand-700 text-white shadow-sm"
                  : "btn-outline border-brand-200 py-2"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
