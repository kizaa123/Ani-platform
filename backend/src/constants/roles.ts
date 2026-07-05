export const ROLES = {
  CROP_FARMER: 1,
  LIVESTOCK_FARMER: 2,
  FARMER_HANDLER: 3,
  BUYER: 4,
  BUYER_HANDLER: 5,
  ANI_ACCOUNTANT: 6,
  ADMIN: 7,
  RESEARCHER: 8,
} as const;

export const ROLE_NAMES: Record<number, string> = {
  1: 'Crop Farmer',
  2: 'Livestock Farmer',
  3: 'Farmer Handler',
  4: 'Buyer',
  5: 'Buyer Handler',
  6: 'ANI Accountant',
  7: 'Admin',
  8: 'Researcher',
};

export const PERMISSIONS = {
  CREATE_LISTING: 'create_listing',
  MANAGE_COMMODITIES: 'manage_commodities',
  VIEW_FARMER_PREVIEW: 'view_farmer_preview',
  VIEW_FULL_FARMER_DATA: 'view_full_farmer_data',
  REQUEST_CONNECTION: 'request_connection',
  APPROVE_CONNECTION: 'approve_connection',
  MANAGE_PAYMENTS: 'manage_payments',
  VERIFY_USERS: 'verify_users',
  MANAGE_LISTINGS: 'manage_listings',
  NEGOTIATE_AS_FARMER: 'negotiate_as_farmer',
  REPRESENT_FARMER: 'represent_farmer',
  SEARCH_FARMERS: 'search_farmers',
  NEGOTIATE_AS_BUYER: 'negotiate_as_buyer',
  REPRESENT_BUYER: 'represent_buyer',
  MANAGE_PACKAGES: 'manage_packages',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_USERS: 'manage_users',
  SEND_MESSAGES: 'send_messages',
  PURCHASE_ACCESS: 'purchase_access',
  CREATE_PUBLICATION: 'create_publication',
  MANAGE_PUBLICATIONS: 'manage_publications',
  VIEW_PUBLICATIONS: 'view_publications',
  PURCHASE_PUBLICATION: 'purchase_publication',
} as const;

export const FARMER_ROLES = [ROLES.CROP_FARMER, ROLES.LIVESTOCK_FARMER];
export const AGENT_ROLES = [ROLES.FARMER_HANDLER, ROLES.BUYER_HANDLER];
export const STAFF_ROLES = [ROLES.ANI_ACCOUNTANT, ROLES.ADMIN];
export const VERIFIABLE_ROLE_IDS = [...FARMER_ROLES, ROLES.BUYER, ROLES.RESEARCHER, ...AGENT_ROLES];

/** Roles exposed on the public registration form (Admin is staff-only). */
export const REGISTERABLE_ROLE_IDS = [
  ROLES.CROP_FARMER,
  ROLES.LIVESTOCK_FARMER,
  ROLES.FARMER_HANDLER,
  ROLES.BUYER,
  ROLES.BUYER_HANDLER,
  ROLES.ANI_ACCOUNTANT,
  ROLES.RESEARCHER,
] as const;

export function isFarmerRole(roleId: number): boolean {
  return FARMER_ROLES.includes(roleId as typeof ROLES.CROP_FARMER);
}

export function isResearcherRole(roleId: number): boolean {
  return roleId === ROLES.RESEARCHER;
}

export function isStaffRole(roleId: number): boolean {
  return STAFF_ROLES.includes(roleId as typeof ROLES.ANI_ACCOUNTANT);
}

export function isFarmerHandler(roleId: number): boolean {
  return roleId === ROLES.FARMER_HANDLER;
}

export function isBuyerHandler(roleId: number): boolean {
  return roleId === ROLES.BUYER_HANDLER;
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
