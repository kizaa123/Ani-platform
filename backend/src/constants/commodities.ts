/** Crop subcategories for Ghana agriculture (legacy "Crop" kept for existing DB rows). */
export const CROP_CATEGORY_NAMES = [
  'Cereals',
  'Roots & Tubers',
  'Vegetables',
  'Fruits',
  'Tree Crops',
  'Legumes',
  'Spices & Herbs',
  'Other Crops',
  'Crop',
] as const;

export const LIVESTOCK_CATEGORY_NAME = 'Livestock';

export type CropCategoryName = (typeof CROP_CATEGORY_NAMES)[number];

export function isCropCategory(name: string): boolean {
  return (CROP_CATEGORY_NAMES as readonly string[]).includes(name);
}

export function isLivestockCategory(name: string): boolean {
  return name === LIVESTOCK_CATEGORY_NAME;
}

export function categoryMatchesFarmerRole(
  categoryName: string,
  roleId: number,
  cropFarmerRoleId: number,
  livestockFarmerRoleId: number
): boolean {
  if (roleId === cropFarmerRoleId) return isCropCategory(categoryName);
  if (roleId === livestockFarmerRoleId) return isLivestockCategory(categoryName);
  return false;
}
