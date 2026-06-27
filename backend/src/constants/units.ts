import { AppError } from '../utils/errors';
import { ROLES } from './roles';

export const CROP_LISTING_UNITS = ['kg', 'bags', 'tonnes', 'crates'] as const;
export const LIVESTOCK_LISTING_UNITS = ['heads', 'litres'] as const;
export const LISTING_UNITS = [...CROP_LISTING_UNITS, ...LIVESTOCK_LISTING_UNITS] as const;

export type ListingUnit = (typeof LISTING_UNITS)[number];

export function defaultListingUnit(roleId: number): ListingUnit {
  return roleId === ROLES.LIVESTOCK_FARMER ? 'heads' : 'bags';
}

export function listingUnitsForRole(roleId: number): readonly ListingUnit[] {
  return roleId === ROLES.LIVESTOCK_FARMER ? LIVESTOCK_LISTING_UNITS : CROP_LISTING_UNITS;
}

export function assertUnitForRole(roleId: number, unit: string): void {
  const allowed = listingUnitsForRole(roleId);
  if (!allowed.includes(unit as ListingUnit)) {
    const label = roleId === ROLES.LIVESTOCK_FARMER ? 'livestock' : 'crop';
    throw new AppError(
      400,
      `${label} farmers must use ${allowed.join(' or ')} — not "${unit}"`
    );
  }
}
