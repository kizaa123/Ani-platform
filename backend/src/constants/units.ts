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
  if (roleId === ROLES.ORGANIZATION_FARMER) return LISTING_UNITS;
  return roleId === ROLES.LIVESTOCK_FARMER ? LIVESTOCK_LISTING_UNITS : CROP_LISTING_UNITS;
}

export function assertUnitForRole(roleId: number, unit: string): void {
  const allowed = listingUnitsForRole(roleId);
  if (!allowed.includes(unit as ListingUnit)) {
    const label =
      roleId === ROLES.LIVESTOCK_FARMER
        ? 'livestock'
        : roleId === ROLES.ORGANIZATION_FARMER
          ? 'organization'
          : 'crop';
    throw new AppError(
      400,
      `${label} farmers must use ${allowed.join(' or ')} — not "${unit}"`
    );
  }
}

const CUSTOM_UNIT_MAX_LENGTH = 50;

/** Accept predefined units (role-checked) or any custom unit label. */
export function validateListingUnit(roleId: number, unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) {
    throw new AppError(400, 'Unit is required');
  }
  if (trimmed.length > CUSTOM_UNIT_MAX_LENGTH) {
    throw new AppError(400, `Unit must be ${CUSTOM_UNIT_MAX_LENGTH} characters or less`);
  }
  if ((LISTING_UNITS as readonly string[]).includes(trimmed)) {
    assertUnitForRole(roleId, trimmed);
  }
  return trimmed;
}
