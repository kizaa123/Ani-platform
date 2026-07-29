export function floDisplayName(firstName: string): string {
  return `FLO_${firstName}`;
}

export function cloDisplayName(firstName: string): string {
  return `CLO_${firstName}`;
}

export const DISTRIBUTION_SHARES = {
  FARMER: 66.66,
  FARMER_HANDLER: 10,
  BUYER_HANDLER: 10,
  /** Remainder after Fellow, FLO, and CLO (13.34% of order total). */
  ANI: 100 - 66.66 - 10 - 10,
} as const;

export type DistributionAmounts = {
  farmer: number;
  farmerHandler: number;
  buyerHandler: number;
  aniPlatform: number;
};

function roundGhc(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function distributionShareAmount(totalAmount: number, percentage: number): number {
  return roundGhc((totalAmount * percentage) / 100);
}

/** Fellow first, then FLO/CLO at fixed order-total points; ANI gets rounded remainder. */
export function calculateDistributionAmounts(totalAmount: number): DistributionAmounts {
  const farmer = distributionShareAmount(totalAmount, DISTRIBUTION_SHARES.FARMER);
  const farmerHandler = distributionShareAmount(totalAmount, DISTRIBUTION_SHARES.FARMER_HANDLER);
  const buyerHandler = distributionShareAmount(totalAmount, DISTRIBUTION_SHARES.BUYER_HANDLER);
  const aniPlatform = roundGhc(totalAmount - farmer - farmerHandler - buyerHandler);
  return { farmer, farmerHandler, buyerHandler, aniPlatform };
}

export function aniPlatformShareAmount(totalAmount: number): number {
  return calculateDistributionAmounts(totalAmount).aniPlatform;
}
