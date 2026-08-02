import { formatFarmAccessFeeForCountry } from '../utils/currency';

/** Fixed one-time fee (GHC) to unlock a fellow's farm for marketplace access. */
export const FARM_ACCESS_PRICE_GHC = 1;

export function formatFarmAccessPriceLabel(
  viewerCountry?: string | null,
  price = FARM_ACCESS_PRICE_GHC
): string {
  return formatFarmAccessFeeForCountry(viewerCountry, price);
}
