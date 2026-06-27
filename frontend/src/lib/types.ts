export interface HandlerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  region: string;
  city?: string;
  profilePicture?: string | null;
  updatedAt?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  roleId: number;
  verificationStatus: string;
}

export interface UserProfile extends User {
  profilePicture?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  updatedAt?: string;
  assignedHandler?: HandlerProfile | null;
  permissions: string[];
  farmerProfile?: FarmerProfile;
  buyerProfile?: BuyerProfile;
  agentProfile?: AgentProfile;
}

export interface FarmerProfile {
  id: string;
  farmName: string;
  farmSize?: string;
  experienceYears?: number;
  verificationStatus: string;
  farmerCommodities?: FarmerCommodity[];
}

export interface FarmerCommodity {
  id: string;
  commodityId: number;
  quantity: number;
  unit: string;
  commodity: Commodity;
}

export interface BuyerProfile {
  id: string;
  company?: string;
  industry?: string;
}

export interface AgentProfile {
  id: string;
  agentType: string;
}

export interface Commodity {
  id: number;
  name: string;
  category: { id: number; name: string };
  variants?: { id: number; variantName: string }[];
}

export interface CommodityCategory {
  id: number;
  name: string;
  commodities: Commodity[];
}

export interface RegisteredCommodity {
  id: number;
  name: string;
  category: string;
  unit?: string;
}

export interface ListingContact {
  email?: string;
  phone?: string;
}

export interface AccessPackageSummary {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  priceLabel: string;
}

export interface FarmerBrowseCard {
  farmerId: string;
  farmerName: string;
  farmName: string;
  farmSize?: string | null;
  profilePicture: string | null;
  country: string;
  region: string;
  city?: string;
  registeredCommodities: RegisteredCommodity[];
  connectionStatus: string;
  hasFarmAccess: boolean;
  canViewProducts: boolean;
  farmAccessFee?: number | null;
  farmAccessPriceLabel?: string | null;
  products: Listing[];
  searchTerms?: string;
}

export interface MarketplaceBrowse {
  farmAccessFee?: number | null;
  farmAccessPriceLabel?: string | null;
  farmers: FarmerBrowseCard[];
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  quantity?: number;
  price?: number;
  unit?: string;
  priceLabel?: string;
  quantityLabel?: string;
  images?: string[];
  location?: string;
  region?: string;
  country?: string;
  farmerName?: string;
  farmerId?: string;
  profilePicture?: string | null;
  commodity?: Commodity;
  registeredCommodities?: RegisteredCommodity[];
  farmer?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    profilePicture?: string;
    farmName?: string;
    farmSize?: string;
    region?: string;
    country?: string;
  };
  contact?: ListingContact;
  status?: string;
  createdAt?: string;
  harvestStartDate?: string | null;
  harvestEndDate?: string | null;
  harvestLabel?: string | null;
  available?: boolean;
  connectionStatus?: string;
  farmerAccess?: boolean;
  hasFarmAccess?: boolean;
  _locked?: boolean;
  _unlockHint?: string;
}

export const CROP_LISTING_UNITS = ["bags", "kg", "tonnes", "crates"] as const;
export const LIVESTOCK_LISTING_UNITS = ["heads", "litres"] as const;
export const LISTING_UNITS = [...CROP_LISTING_UNITS, ...LIVESTOCK_LISTING_UNITS] as const;

export type ListingUnit = (typeof LISTING_UNITS)[number];

export function defaultListingUnit(roleId: number): ListingUnit {
  return roleId === ROLES.LIVESTOCK_FARMER ? "heads" : "bags";
}

export function listingUnitsForRole(roleId: number): readonly ListingUnit[] {
  return roleId === ROLES.LIVESTOCK_FARMER ? LIVESTOCK_LISTING_UNITS : CROP_LISTING_UNITS;
}

/** Human-friendly label for quantity units (e.g. heads → animals). */
export function formatListingUnit(unit: string): string {
  if (unit === "heads") return "animals";
  return unit;
}

export function isLivestockFarmer(roleId: number) {
  return roleId === ROLES.LIVESTOCK_FARMER;
}

export { assetUrl } from "./assetUrl";

export interface ProductOrderLineItem {
  id: string;
  buyerId?: string;
  listingId?: string;
  date: string;
  productName: string;
  productImage?: string | null;
  commodity: string;
  category: string;
  productLocation?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string | null;
  trackStage?: import("./orderTrack").OrderTrackStage;
  trackUpdatedAt?: string | null;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone: string;
  buyerLocation: string;
  buyerCountry?: string;
  buyerProfilePicture?: string | null;
  purchaseCount?: number;
}

export interface FinancialStatementLineItem {
  id: string;
  date: string;
  title: string;
  productName?: string;
  productImage?: string | null;
  commodity: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  status: string;
  type?: "LISTING" | "SALE";
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerLocation?: string;
  buyerCountry?: string;
  buyerProfilePicture?: string | null;
  paymentMethod?: string;
  transactionId?: string | null;
  purchaseCount?: number;
}

export interface FinancialStatement {
  farmName: string;
  farmerName: string;
  email: string;
  country: string;
  region: string;
  generatedAt: string;
  summary: {
    activeListings: number;
    totalListedValue: number;
    soldListings: number;
    totalSoldValue: number;
    totalSalesRevenue: number;
    totalSalesCount: number;
    archivedListings: number;
    acceptedConnections: number;
    pendingConnections: number;
    totalProducts: number;
  };
  lineItems: FinancialStatementLineItem[];
  salesLineItems: FinancialStatementLineItem[];
}

export interface BuyerOrderLineItem {
  id: string;
  buyerId?: string;
  listingId?: string;
  date: string;
  productName: string;
  productImage?: string | null;
  commodity: string;
  category: string;
  productLocation?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string | null;
  trackStage?: import("./orderTrack").OrderTrackStage;
  trackUpdatedAt?: string | null;
  farmerName: string;
  farmerEmail?: string;
  farmerPhone: string;
  farmerLocation: string;
  farmerCountry?: string;
  farmerProfilePicture?: string | null;
  farmName?: string | null;
  purchaseCount?: number;
  /** @deprecated use productName */
  title?: string;
  /** @deprecated use farmerLocation */
  farmerRegion?: string;
  /** @deprecated use farmerLocation */
  farmerCountry?: string;
}

export interface BuyerAccessPaymentLineItem {
  id: string;
  date: string;
  farmerName: string;
  farmName?: string | null;
  farmerRegion?: string;
  farmerCountry?: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string | null;
  status: string;
}

export interface BuyerFinancialStatement {
  buyerName: string;
  email: string;
  country: string;
  region: string;
  company?: string | null;
  generatedAt: string;
  summary: {
    totalOrders: number;
    paidOrders: number;
    totalProductSpend: number;
    totalFarmAccessSpend: number;
    totalSpent: number;
    farmsAccessed: number;
  };
  farmAccessPayments: BuyerAccessPaymentLineItem[];
}

export interface AccessPackage {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

export interface AgentClientOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePicture?: string | null;
  updatedAt?: string;
  country?: string;
  region?: string;
  city?: string;
  roleId?: number;
  verificationStatus?: string;
  role: { roleName: string };
  isFarmer?: boolean;
  commodities?: Array<{ id: number; name: string; category: string }>;
  farmerProfile?: {
    farmName: string;
    farmSize?: string | null;
    experienceYears?: number | null;
  } | null;
  buyerProfile?: { company?: string | null } | null;
}

export interface AgentAssignment {
  id: string;
  relationshipType: string;
  createdAt?: string;
  owner: AgentClientOwner;
}

export interface HandlerClientFarm {
  assignmentId: string;
  relationshipType: string;
  clientType: "farmer" | "buyer";
  farmer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    profilePicture?: string | null;
    updatedAt?: string;
    country: string;
    region: string;
    city: string;
    address?: string | null;
    verificationStatus: string;
    role: string;
    farmName: string;
    farmSize?: string | null;
    experienceYears?: number | null;
    commodities: Array<{ id: number; name: string; category: string; unit: string }>;
  };
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    profilePicture?: string | null;
    updatedAt?: string;
    country: string;
    region: string;
    city: string;
    address?: string | null;
    company?: string | null;
    industry?: string | null;
    verificationStatus: string;
    role: string;
  };
  stats?: {
    totalOrders: number;
    paidOrders: number;
    totalProductSpend: number;
    totalFarmAccessSpend: number;
    totalSpent: number;
    farmsAccessed: number;
    acceptedConnections: number;
    pendingConnections: number;
    hasPlatformAccess: boolean;
    farmAccess: Array<{
      id: string;
      farmerId: string;
      farmerName: string;
      farmName: string | null;
      amount: number;
      paidAt: string;
    }>;
  };
  products?: Listing[];
  productCount?: number;
}

export interface Connection {
  id: string;
  status: string;
  createdAt: string;
  accessPaid?: boolean;
  farmAccess?: {
    amount: number;
    status: string;
    paidAt: string;
    paymentMethod: string;
  } | null;
  buyer?: ConnectionUser;
  farmer?: ConnectionUser;
  agent?: { id: string; firstName: string; lastName: string };
}

export interface ConnectionUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  region?: string;
  city?: string | null;
  country?: string;
  profilePicture?: string | null;
  farmName?: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  } | null;
}

export interface Message {
  id: string;
  message: string;
  createdAt: string;
  senderId: string;
  sender: { firstName: string; lastName: string };
}

export const ROLES = {
  CROP_FARMER: 1,
  LIVESTOCK_FARMER: 2,
  FARMER_HANDLER: 3,
  BUYER: 4,
  BUYER_HANDLER: 5,
  ANI_ACCOUNTANT: 6,
  ADMIN: 7,
} as const;

export function fullName(u: { firstName: string; lastName: string }) {
  return `${u.firstName} ${u.lastName}`;
}

export function isFarmer(roleId: number) {
  return roleId === ROLES.CROP_FARMER || roleId === ROLES.LIVESTOCK_FARMER;
}

export function farmerCategoryFilter(roleId: number): "Crop" | "Livestock" | null {
  if (roleId === ROLES.CROP_FARMER) return "Crop";
  if (roleId === ROLES.LIVESTOCK_FARMER) return "Livestock";
  return null;
}

export function isBuyer(roleId: number) {
  return roleId === ROLES.BUYER;
}

export function isHandler(roleId: number) {
  return roleId === ROLES.FARMER_HANDLER || roleId === ROLES.BUYER_HANDLER;
}

export function isBuyerHandler(roleId: number) {
  return roleId === ROLES.BUYER_HANDLER;
}

export function isFarmerHandler(roleId: number) {
  return roleId === ROLES.FARMER_HANDLER;
}

export function isStaff(roleId: number) {
  return roleId === ROLES.ANI_ACCOUNTANT || roleId === ROLES.ADMIN;
}
