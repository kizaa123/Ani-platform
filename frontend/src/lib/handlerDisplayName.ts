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
  ANI: 13.34,
} as const;

export function distributionShareAmount(totalAmount: number, percentage: number): number {
  return Math.round(((totalAmount * percentage) / 100) * 100) / 100;
}

export function aniPlatformShareAmount(totalAmount: number): number {
  return distributionShareAmount(totalAmount, DISTRIBUTION_SHARES.ANI);
}
