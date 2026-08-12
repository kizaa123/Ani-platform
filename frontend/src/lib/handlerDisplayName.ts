export function floDisplayName(firstName: string): string {
  return `FLO_${firstName}`;
}

export function cloDisplayName(firstName: string): string {
  return `CLO_${firstName}`;
}

function roundGhc(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export const DISTRIBUTION_SHARES = {
  FARMER: 66.66,
  /** Post-Fellow platform pool as % of order total. */
  PLATFORM_POOL: roundGhc(100 - 66.66),
  /** Handlers combined share of the platform pool. */
  HANDLER_POOL: 20,
  /** Platform share of the platform pool when both handlers are assigned. */
  PLATFORM_RETAINED_POOL: 80,
  /** Each assigned handler receives this % of the platform pool. */
  HANDLER_OF_POOL: 10,
  /** Each assigned handler's share of order total. */
  HANDLER_OF_TOTAL: roundGhc((roundGhc(100 - 66.66) * 10) / 100),
} as const;

/** Platform share of order total when both handlers are assigned. */
export const PLATFORM_SHARE_PERCENT = roundGhc(
  (DISTRIBUTION_SHARES.PLATFORM_POOL * DISTRIBUTION_SHARES.PLATFORM_RETAINED_POOL) / 100
);

export type DistributionAmounts = {
  farmer: number;
  farmerHandler: number;
  buyerHandler: number;
  platformShare: number;
  remainder: number;
};

export type DistributionHandlerOptions = {
  hasFarmerHandler?: boolean;
  hasBuyerHandler?: boolean;
};

export function distributionShareAmount(totalAmount: number, percentage: number): number {
  return roundGhc((totalAmount * percentage) / 100);
}

/**
 * Fellow first (66.66%); platform pool (33.34%) splits 20% to handlers / 80% to platform.
 * Each assigned handler receives 10% of the platform pool; unassigned shares go to platform.
 */
export function calculateDistributionAmounts(
  totalAmount: number,
  options: DistributionHandlerOptions = {}
): DistributionAmounts {
  const hasFarmerHandler = options.hasFarmerHandler ?? true;
  const hasBuyerHandler = options.hasBuyerHandler ?? true;

  const farmer = distributionShareAmount(totalAmount, DISTRIBUTION_SHARES.FARMER);
  const remainder = roundGhc(totalAmount - farmer);
  const farmerHandler = hasFarmerHandler
    ? distributionShareAmount(remainder, DISTRIBUTION_SHARES.HANDLER_OF_POOL)
    : 0;
  const buyerHandler = hasBuyerHandler
    ? distributionShareAmount(remainder, DISTRIBUTION_SHARES.HANDLER_OF_POOL)
    : 0;
  const platformShare = roundGhc(totalAmount - farmer - farmerHandler - buyerHandler);

  return { farmer, farmerHandler, buyerHandler, platformShare, remainder };
}

export function platformShareAmount(
  totalAmount: number,
  options?: DistributionHandlerOptions
): number {
  return calculateDistributionAmounts(totalAmount, options).platformShare;
}

/** Policy rate of order total for an assigned handler. */
export function handlerSharePercentOfTotal(
  options: DistributionHandlerOptions & { role: "FARMER_HANDLER" | "BUYER_HANDLER" } = {
    role: "FARMER_HANDLER",
  }
): number {
  const hasHandler =
    options.role === "FARMER_HANDLER"
      ? (options.hasFarmerHandler ?? true)
      : (options.hasBuyerHandler ?? true);
  return hasHandler ? DISTRIBUTION_SHARES.HANDLER_OF_TOTAL : 0;
}

/** Policy rate of order total - not derived from rounded GHC amounts. */
export function platformSharePercentOfTotal(
  _totalAmount: number,
  options: DistributionHandlerOptions = {}
): number {
  const hasFarmerHandler = options.hasFarmerHandler ?? true;
  const hasBuyerHandler = options.hasBuyerHandler ?? true;

  let percent = PLATFORM_SHARE_PERCENT;
  if (!hasFarmerHandler) percent += DISTRIBUTION_SHARES.HANDLER_OF_TOTAL;
  if (!hasBuyerHandler) percent += DISTRIBUTION_SHARES.HANDLER_OF_TOTAL;
  return roundGhc(percent);
}
