import { randomUUID } from 'crypto';
import prisma from '../database/prisma';

export type HarvestListing = {
  status: string;
  quantity: number;
  harvestEndDate?: Date | null;
};

export type FarmAccessRecord = {
  status: string;
  expiresAt?: Date | null;
  accessCycleId?: string | null;
  createdAt?: Date;
};

/** Stable cycle id for legacy rows where farm_access_cycle_id is still null in the DB. */
export function resolveFarmAccessCycleId(
  farmAccessCycleId: string | null | undefined,
  farmerProfileId: string
): string {
  return farmAccessCycleId ?? farmerProfileId;
}

/** Last instant (UTC) of a harvest calendar day — access remains valid through this day. */
export function endOfHarvestDayUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** True when the harvest end date is before today (UTC calendar day). */
export function isHarvestExpired(harvestEndDate: Date | string | null | undefined, now = new Date()): boolean {
  if (!harvestEndDate) return false;
  const end = endOfHarvestDayUtc(new Date(harvestEndDate));
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return end < todayStart;
}

/** ACTIVE listing with stock and a non-expired harvest window. */
export function isListingOrderable(listing: HarvestListing, now = new Date()): boolean {
  if (listing.status !== 'ACTIVE' || listing.quantity <= 0) return false;
  return !isHarvestExpired(listing.harvestEndDate, now);
}

/** Latest harvest end among orderable listings; null when none have an end date. */
export function computeFarmAccessExpiry(
  listings: Array<{ harvestEndDate?: Date | null }>,
  now = new Date()
): Date | null {
  const orderable = listings.filter((l) => isListingOrderable(l as HarvestListing, now));
  const ends = orderable
    .map((l) => l.harvestEndDate)
    .filter((d): d is Date => d instanceof Date);
  if (ends.length === 0) return null;
  const latest = ends.reduce((max, d) => (d > max ? d : max), ends[0]);
  return endOfHarvestDayUtc(latest);
}

export function isFarmAccessRecordValid(
  record: FarmAccessRecord | null | undefined,
  farmerAccessCycleId: string,
  fallbackExpiry?: Date | null,
  newestListingCreatedAt?: Date | null,
  now = new Date()
): boolean {
  if (!record || record.status !== 'COMPLETED') return false;

  if (record.accessCycleId) {
    if (record.accessCycleId !== farmerAccessCycleId) return false;
  } else if (
    newestListingCreatedAt &&
    record.createdAt &&
    record.createdAt < newestListingCreatedAt
  ) {
    // Legacy access: invalidated when the fellow posted a newer product
    return false;
  }

  const expiry = record.expiresAt ?? fallbackExpiry ?? null;
  if (expiry && isHarvestExpired(expiry, now)) {
    return false;
  }

  return true;
}

export function hasPaidFarmAccessRecord(record: FarmAccessRecord | null | undefined): boolean {
  return record?.status === 'COMPLETED';
}

export async function rotateFarmerAccessCycle(farmerProfileId: string): Promise<string> {
  const cycleId = randomUUID();
  await prisma.farmerProfile.update({
    where: { id: farmerProfileId },
    data: { farmAccessCycleId: cycleId },
  });
  return cycleId;
}

export async function getFarmerOrderableListings(farmerUserId: string) {
  const listings = await prisma.commodityListing.findMany({
    where: {
      status: 'ACTIVE',
      quantity: { gt: 0 },
      farmer: { userId: farmerUserId },
    },
    select: {
      id: true,
      status: true,
      quantity: true,
      harvestEndDate: true,
      createdAt: true,
    },
  });
  return listings.filter((l) => isListingOrderable(l));
}

export async function getFarmerAccessContext(farmerUserId: string) {
  const profile = await prisma.farmerProfile.findUnique({
    where: { userId: farmerUserId },
    select: { id: true, farmAccessCycleId: true },
  });
  if (!profile) return null;

  const listings = await prisma.commodityListing.findMany({
    where: { farmerId: profile.id, status: { in: ['ACTIVE', 'SOLD'] } },
    select: {
      id: true,
      status: true,
      quantity: true,
      harvestStartDate: true,
      harvestEndDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const orderableListings = listings.filter((l) => isListingOrderable(l));
  const hasAvailableProduct = orderableListings.length > 0;
  const fallbackExpiry = computeFarmAccessExpiry(listings);
  const newestListingCreatedAt = listings[0]?.createdAt ?? null;

  return {
    profile: {
      ...profile,
      farmAccessCycleId: resolveFarmAccessCycleId(profile.farmAccessCycleId, profile.id),
    },
    listings,
    orderableListings,
    hasAvailableProduct,
    fallbackExpiry,
    newestListingCreatedAt,
  };
}
