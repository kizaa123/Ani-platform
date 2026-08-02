/** City, region, country - matches backend `formatUserLocation` in orders utils. */
export function formatUserLocation(user: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  address?: string | null;
}): string {
  const parts = [user.city, user.region, user.country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return user.address?.trim() ?? "";
}
