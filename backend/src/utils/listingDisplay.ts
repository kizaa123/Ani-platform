/** Resolve display name for a listing commodity (catalog or custom). */
export function listingCommodityName(listing: {
  commodity?: { name: string } | null;
  customCommodityName?: string | null;
}): string {
  const custom = listing.customCommodityName?.trim();
  if (custom) return custom;
  return listing.commodity?.name ?? 'Unknown';
}

/** Resolve display category for a listing commodity. */
export function listingCommodityCategory(listing: {
  commodity?: { category?: { name: string } } | null;
  customCommodityName?: string | null;
}): string {
  if (listing.customCommodityName?.trim()) return 'Custom';
  return listing.commodity?.category?.name ?? '-';
}
