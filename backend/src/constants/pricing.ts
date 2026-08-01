/** Fixed one-time fee (GHC) to unlock a fellow's farm for marketplace access. */
export const FARM_ACCESS_PRICE_GHC = 1;

export function formatFarmAccessPriceLabel(price = FARM_ACCESS_PRICE_GHC): string {
  return `GHC ${price.toFixed(2)}`;
}
