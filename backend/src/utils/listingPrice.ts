/** Farmer enters base price X; buyers see listed price = X + X/2 = 1.5 × X. */
export function computeListedPrice(basePrice: number): number {
  return Math.round(basePrice * 1.5 * 100) / 100;
}

/** Reverse conversion for edit forms when stored price is the listed (final) price. */
export function basePriceFromListed(listedPrice: number): number {
  return Math.round((listedPrice / 1.5) * 100) / 100;
}
