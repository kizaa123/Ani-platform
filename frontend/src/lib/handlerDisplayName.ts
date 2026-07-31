export function floDisplayName(firstName: string): string {
  return `FLO_${firstName}`;
}

export function cloDisplayName(firstName: string): string {
  return `CLO_${firstName}`;
}

export const DISTRIBUTION_SHARES = {
  FARMER: 66.66,
  /** Each assigned handler receives 10% of the post-Fellow remainder. */
  FARMER_HANDLER: 10,
  BUYER_HANDLER: 10,
} as const;

export type DistributionAmounts = {
  farmer: number;
  farmerHandler: number;
  buyerHandler: number;
  aniPlatform: number;
  remainder: number;
};

export type DistributionHandlerOptions = {
  hasFarmerHandler?: boolean;
  hasBuyerHandler?: boolean;
};

function roundGhc(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function distributionShareAmount(totalAmount: number, percentage: number): number {
  return roundGhc((totalAmount * percentage) / 100);
}

/** Fellow first; handlers take 10% of post-Fellow remainder; ANI gets rounded remainder. */
export function calculateDistributionAmounts(
  totalAmount: number,
  options: DistributionHandlerOptions = {}
): DistributionAmounts {
  const hasFarmerHandler = options.hasFarmerHandler ?? true;
  const hasBuyerHandler = options.hasBuyerHandler ?? true;

  const farmer = distributionShareAmount(totalAmount, DISTRIBUTION_SHARES.FARMER);
  const remainder = roundGhc(totalAmount - farmer);
  const farmerHandler = hasFarmerHandler
    ? distributionShareAmount(remainder, DISTRIBUTION_SHARES.FARMER_HANDLER)
    : 0;
  const buyerHandler = hasBuyerHandler
    ? distributionShareAmount(remainder, DISTRIBUTION_SHARES.BUYER_HANDLER)
    : 0;
  const aniPlatform = roundGhc(totalAmount - farmer - farmerHandler - buyerHandler);

  return { farmer, farmerHandler, buyerHandler, aniPlatform, remainder };
}

export function aniPlatformShareAmount(
  totalAmount: number,
  options?: DistributionHandlerOptions
): number {
  return calculateDistributionAmounts(totalAmount, options).aniPlatform;
}

export function aniPlatformSharePercentOfTotal(
  totalAmount: number,
  options?: DistributionHandlerOptions
): number {
  if (totalAmount <= 0) return 0;
  return roundGhc((aniPlatformShareAmount(totalAmount, options) / totalAmount) * 100);
}
