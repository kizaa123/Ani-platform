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
  const base = `/agents/farm/${ownerId}`;

  const tabs = [
    { href: base, label: "Farm & products", match: (p: string) => p === base },
    {
      href: `${base}/orders`,
      label: "Buyer orders",
      match: (p: string) => p.startsWith(`${base}/orders`),
    },
    {
      href: `${base}/financials`,
      label: "Financial statement",
      match: (p: string) => p.startsWith(`${base}/financials`),
    },
  ];

  return (
    <div className="mb-6">
      <Link href="/agents" className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to My Clients
      </Link>
      {farmName && (
        <p className="mt-2 text-sm text-gray-500">
          Managing <span className="font-semibold text-brand-800">{farmName}</span>
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
