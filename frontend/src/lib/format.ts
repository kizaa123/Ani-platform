export function formatGhc(amount: number) {
  return `GHC ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
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
