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
