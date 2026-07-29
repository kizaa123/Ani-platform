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
  verificationTags?: UserVerificationTag[];
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
  researcherProfile?: ResearcherProfile;
}

export interface ResearcherProfile {
  id: string;
  institution?: string;
  expertise?: string;
  bio?: string;
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

export interface FarmerMediaItem {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  duration?: number | null;
  orderIndex: number;
  likesCount: number;
  sharesCount: number;
  likedByMe?: boolean;
  createdAt: string;
}

export interface ProductMediaItem {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  duration?: number | null;
  orderIndex: number;
  likesCount: number;
  sharesCount: number;
  likedByMe?: boolean;
  createdAt: string;
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
  verificationStatus?: string;
  verificationTags?: UserVerificationTag[];
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
  media?: ProductMediaItem[];
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

export function normalizeListingUnit(unit: string | undefined, roleId: number): ListingUnit {
  const allowed = listingUnitsForRole(roleId);
  if (unit && (allowed as readonly string[]).includes(unit)) {
    return unit as ListingUnit;
  }
  return defaultListingUnit(roleId);
}

export function isLivestockFarmer(roleId: number) {
  return roleId === ROLES.LIVESTOCK_FARMER;
}

export { assetUrl } from "./assetUrl";

export interface OrderEscrowFields {
  orderId?: string;
  escrowStatus?: 'HELD' | 'RELEASED';
  otpVerifiedAt?: string | null;
  paymentReleasedAt?: string | null;
  canRelease?: boolean;
  releaseOtp?: string | null;
}

export interface OrderDetail extends OrderEscrowFields {
  id: string;
  buyerId: string;
  farmerId: string;
  listingId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string | null;
  trackStage?: import("./orderTrack").OrderTrackStage;
  trackUpdatedAt?: string | null;
  createdAt: string;
  productName: string;
  buyerName: string;
  farmerName: string;
}

export interface OrderReleaseResult {
  id: string;
  escrowStatus: 'HELD' | 'RELEASED';
  otpVerifiedAt: string | null;
  paymentReleasedAt: string | null;
  canRelease: boolean;
  releaseOtp: string | null;
}

export interface ProductOrderLineItem extends OrderEscrowFields {
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
  orderName?: string;
  orderDescription?: string;
}

export interface FinancialStatementLineItem {
  id: string;
  date: string;
  title: string;
  productName?: string;
  orderName?: string;
  orderDescription?: string;
  orderId?: string;
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

export interface BuyerOrderLineItem extends OrderEscrowFields {
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
  productOrders: BuyerOrderLineItem[];
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
  verificationStatus?: string;
  verificationTags?: UserVerificationTag[];
}

export interface NotificationMetadata {
  imageUrl?: string | null;
  price?: number | null;
  priceLabel?: string | null;
  farmerId?: string | null;
  farmerUserId?: string | null;
  listingId?: string | null;
  publicationId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  orderName?: string | null;
  orderDescription?: string | null;
  farmSize?: string | null;
  location?: string | null;
  commodities?: string[] | null;
  farmerName?: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  metadata?: NotificationMetadata | null;
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
  RESEARCHER: 8,
  STUDENT: 9,
  CTO: 10,
  COMMUNICATION_OFFICER: 11,
} as const;

export const STAFF_ROLE_OPTIONS = [
  { id: ROLES.ADMIN, label: "Admin" },
  { id: ROLES.ANI_ACCOUNTANT, label: "ANI Accountant" },
  { id: ROLES.CTO, label: "CTO" },
  { id: ROLES.COMMUNICATION_OFFICER, label: "Communication Officer" },
] as const;

export function fullName(u: { firstName: string; lastName: string }) {
  return `${u.firstName} ${u.lastName}`;
}

export function isFarmer(roleId: number) {
  return roleId === ROLES.CROP_FARMER || roleId === ROLES.LIVESTOCK_FARMER;
}

/** Crop subcategories seeded for Ghana agriculture (legacy "Crop" for existing DB rows). */
export const CROP_CATEGORY_NAMES = [
  "Cereals",
  "Roots & Tubers",
  "Vegetables",
  "Fruits",
  "Tree Crops",
  "Legumes",
  "Spices & Herbs",
  "Other Crops",
  "Crop",
] as const;

export const LIVESTOCK_CATEGORY_NAME = "Livestock";

export function isCropCategory(name: string): boolean {
  return (CROP_CATEGORY_NAMES as readonly string[]).includes(name);
}

export function isLivestockCategory(name: string): boolean {
  return name === LIVESTOCK_CATEGORY_NAME;
}

export function farmerCategoryFilter(roleId: number): "Crop" | "Livestock" | null {
  if (roleId === ROLES.CROP_FARMER) return "Crop";
  if (roleId === ROLES.LIVESTOCK_FARMER) return "Livestock";
  return null;
}

export function filterCategoriesForRole(
  categories: CommodityCategory[],
  roleId: number
): CommodityCategory[] {
  const kind = farmerCategoryFilter(roleId);
  if (!kind) return [];
  const filtered =
    kind === "Livestock"
      ? categories.filter((c) => c.name === LIVESTOCK_CATEGORY_NAME)
      : categories.filter((c) => isCropCategory(c.name));
  const order = new Map(CROP_CATEGORY_NAMES.map((name, i) => [name, i]));
  return [...filtered].sort((a, b) => {
    const ai = order.get(a.name as (typeof CROP_CATEGORY_NAMES)[number]) ?? 999;
    const bi = order.get(b.name as (typeof CROP_CATEGORY_NAMES)[number]) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

export function isBuyer(roleId: number) {
  return roleId === ROLES.BUYER;
}

export function isMarketplaceBuyer(roleId: number) {
  return roleId === ROLES.BUYER || roleId === ROLES.RESEARCHER;
}

export function isStudent(roleId: number) {
  return roleId === ROLES.STUDENT;
}

export function canPurchasePublication(roleId: number) {
  return roleId === ROLES.BUYER || roleId === ROLES.STUDENT;
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
  return (
    roleId === ROLES.ANI_ACCOUNTANT ||
    roleId === ROLES.ADMIN ||
    roleId === ROLES.CTO ||
    roleId === ROLES.COMMUNICATION_OFFICER
  );
}

export function isAdmin(roleId: number) {
  return roleId === ROLES.ADMIN;
}

export function isAccountant(roleId: number) {
  return roleId === ROLES.ANI_ACCOUNTANT;
}

export function isResearcher(roleId: number) {
  return roleId === ROLES.RESEARCHER;
}

export type ResearchPublicationCategory = "CROP_FARM" | "LIVESTOCK_FARM" | "OTHER";

export interface ResearchPublication {
  id: string;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  coverImage?: string | null;
  category?: ResearchPublicationCategory;
  price?: number | null;
  isFree: boolean;
  viewCount: number;
  likesCount: number;
  sharesCount: number;
  likedByMe?: boolean;
  commentsCount?: number;
  status: string;
  createdAt: string;
  hasAccess?: boolean;
  isLocked?: boolean;
  researcher: {
    id: string;
    name: string;
    profilePicture?: string | null;
    verificationStatus?: string;
    verificationTags?: UserVerificationTag[];
  };
}

export interface PublisherBrowseCard {
  id: string;
  name: string;
  profilePicture?: string | null;
  institution?: string | null;
  bio?: string | null;
  verificationStatus?: string;
  verificationTags?: UserVerificationTag[];
  publicationCount: number;
  canViewFiles: boolean;
}

export interface PublisherLibrary {
  publisher: PublisherBrowseCard & {
    expertise?: string | null;
  };
  publications: ResearchPublication[];
}

export interface ResearchComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profilePicture?: string | null;
  };
}

export interface ResearcherFinancialStatement {
  institution?: string | null;
  researcherName: string;
  email: string;
  country: string;
  region: string;
  generatedAt: string;
  summary: {
    totalPublications: number;
    freePublications: number;
    paidPublications: number;
    totalViews: number;
    totalSales: number;
    totalEarnings: number;
  };
  lineItems: {
    id: string;
    date: string;
    title: string;
    isFree: boolean;
    price?: number | null;
    viewCount: number;
    type: string;
  }[];
  salesLineItems: {
    id: string;
    date: string;
    title: string;
    studentName: string;
    studentEmail: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string | null;
    type: string;
  }[];
}

export interface AdminStats {
  users: number;
  farmers: number;
  buyers: number;
  buyerHandlers: number;
  farmerHandlers: number;
  listings: number;
  totalRevenue: number;
  activeConnections: number;
  pendingVerifications: number;
  pendingConnections: number;
}

export interface AdminDashboardCharts {
  generatedAt: string;
  userGrowth: {
    month: string;
    label: string;
    users: number;
    cumulativeUsers: number;
  }[];
  ordersTrend: {
    month: string;
    label: string;
    orders: number;
    revenue: number;
  }[];
  roleDistribution: {
    roleId: number;
    label: string;
    count: number;
  }[];
  verificationStatus: {
    status: string;
    count: number;
  }[];
  recentActivity: {
    id: string;
    type: "USER_REGISTERED" | "ORDER" | "CONNECTION";
    label: string;
    date: string;
    amount?: number;
  }[];
}

export interface PlatformFinancialStatementLineItem {
  id: string;
  date: string;
  type: 'PRODUCT_ORDER' | 'FARM_ACCESS' | 'RESEARCH_SALE';
  description: string;
  partyName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  escrowStatus?: string;
  otpVerifiedAt?: string | null;
  transactionId?: string | null;
}

export interface PlatformFinancialStatement {
  generatedAt: string;
  summary: {
    totalRevenue: number;
    productOrderRevenue: number;
    farmAccessRevenue: number;
    researchRevenue: number;
    transactionCount: number;
    productOrderCount: number;
    farmAccessCount: number;
    researchSaleCount: number;
  };
  lineItems: PlatformFinancialStatementLineItem[];
}

export interface AccountantOverview {
  generatedAt: string;
  totalRevenue: number;
  accessRevenue: number;
  orderShareRevenue: number;
  orderShareCount: number;
  farmAccessRevenue: number;
  researchRevenue: number;
  legacyAccessRevenue: number;
  transactionCount: number;
  farmAccessCount: number;
  researchSaleCount: number;
  legacyAccessCount: number;
  accessPaymentCount: number;
  totalWithdrawn: number;
  withdrawalCount: number;
  availableBalance: number;
  pendingPaidConnections: number;
}

export interface AccountantIncomeChart {
  generatedAt: string;
  monthlyIncome: {
    month: string;
    label: string;
    revenue: number;
  }[];
}

export interface AccountantDashboardCharts {
  generatedAt: string;
  monthlyRevenue: {
    month: string;
    label: string;
    revenue: number;
  }[];
  monthlyAccessRevenue: {
    month: string;
    label: string;
    revenue: number;
  }[];
  monthlyOrderShareRevenue: {
    month: string;
    label: string;
    revenue: number;
  }[];
  revenueBySource: {
    month: string;
    label: string;
    access: number;
    orderShare: number;
  }[];
  accessBreakdownByMonth: {
    month: string;
    label: string;
    farmAccess: number;
    research: number;
    legacyAccess: number;
  }[];
  revenueStreamTotals: {
    key: string;
    label: string;
    amount: number;
  }[];
  accessBreakdownTotals: {
    key: string;
    label: string;
    amount: number;
  }[];
  transactionVolume: {
    month: string;
    label: string;
    count: number;
  }[];
  cashFlow: {
    month: string;
    label: string;
    income: number;
    withdrawals: number;
  }[];
}

export interface PlatformWithdrawal {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export type VerificationTagType = "STANDARD" | "INTERNATIONAL_FARMER" | "INTERNATIONAL_BUYER";

export interface UserVerificationTag {
  id: string;
  userId: string;
  tagType: VerificationTagType;
  assignedBy: string;
  createdAt: string;
}

export interface OrderDistributionLine {
  id: string;
  role: string;
  roleLabel: string;
  percentage: number;
  amount: number;
  status: "PENDING" | "DISTRIBUTED";
  paymentMethod?: string | null;
  distributedAt?: string | null;
  transactionId?: string | null;
  recipientUserId?: string | null;
  recipientName: string;
  recipientEmail?: string | null;
  canDistribute: boolean;
}

export interface OrderMoneyDistributionSnapshot {
  orderId: string;
  orderName?: string;
  buyerName: string;
  farmerName: string;
  totalAmount: number;
  allDistributed: boolean;
  lines: OrderDistributionLine[];
}

export interface HandlerFinancialClientSummary {
  ownerId: string;
  clientName: string;
  clientLabel: string;
  totalRevenue?: number;
  salesCount?: number;
  totalSpent?: number;
  totalProductSpend?: number;
  totalFarmAccessSpend?: number;
  orderCount?: number;
}

export interface HandlerFinancialTransaction {
  id: string;
  date: string;
  ownerId: string;
  clientName: string;
  description: string;
  orderName?: string;
  orderDescription?: string;
  orderId?: string;
  counterpartyName: string;
  amount: number;
  type: 'SALE' | 'PRODUCT_ORDER' | 'FARM_ACCESS' | 'DISTRIBUTION';
  paymentMethod: string;
  status: string;
  transactionId?: string | null;
}

export interface HandlerFinancialStatement {
  agentName: string;
  handlerType: 'farmer' | 'buyer';
  generatedAt: string;
  summary: {
    clientCount: number;
    totalRevenue?: number;
    totalSalesCount?: number;
    totalSpent?: number;
    totalProductSpend?: number;
    totalFarmAccessSpend?: number;
    transactionCount: number;
  };
  transactions: HandlerFinancialTransaction[];
  handlerPayments?: HandlerFinancialTransaction[];
  clientTransactions?: HandlerFinancialTransaction[];
}

export interface AdminVerificationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: number;
  verificationStatus: string;
  createdAt: string;
  role: { roleName: string };
  farmerProfile?: { farmName: string; verificationStatus: string } | null;
  buyerProfile?: { company: string | null } | null;
  agentProfile?: { agentType: string } | null;
  verificationTags?: UserVerificationTag[];
}

export type PendingVerificationUser = AdminVerificationUser;

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  verificationStatus: string;
  createdAt: string;
}
