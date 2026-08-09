import { formatForViewer, formatAmountNumberForCountry } from "./currency";

export function formatGhc(amount: number, viewerCountry?: string | null) {
  return formatForViewer(amount, viewerCountry ?? "Ghana");
}

/** Amount without the currency code — for table cells where the header shows it, e.g. "Amount (GHC)". */
export function formatGhcPlain(amount: number, viewerCountry?: string | null) {
  return formatAmountNumberForCountry(amount, viewerCountry ?? "Ghana");
}

/** Compact axis label for currency charts - no prefix, abbreviated at scale. */
export function formatGhcAxis(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const v = amount / 1_000_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const v = amount / 1_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}k`;
  }
  return Math.round(amount).toLocaleString();
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function orderStatusStyle(status: string) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
    case "FAILED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export function escrowStatusStyle(status: string) {
  switch (status) {
    case "RELEASED":
      return "bg-green-100 text-green-800";
    case "HELD":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function escrowStatusLabel(status: string) {
  switch (status) {
    case "RELEASED":
      return "Released to ANI Accountant";
    case "HELD":
      return "Held in escrow";
    default:
      return status;
  }
}
