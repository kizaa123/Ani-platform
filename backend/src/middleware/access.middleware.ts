import { Response, NextFunction } from 'express';
import prisma from '../database/prisma';
import { AuthRequest } from './auth.middleware';
import { ROLES, isFarmerRole, isStaffRole } from '../constants/roles';
import { normalizeImages } from './upload.middleware';

export async function buyerHasFarmerFarmAccess(buyerId: string, farmerUserId: string): Promise<boolean> {
  const record = await prisma.buyerFarmerAccess.findUnique({
    where: { buyerId_farmerId: { buyerId, farmerId: farmerUserId } },
  });
  return record?.status === 'COMPLETED';
}

export async function buyerFarmAccessSet(buyerId: string): Promise<Set<string>> {
  const rows = await prisma.buyerFarmerAccess.findMany({
    where: { buyerId, status: 'COMPLETED' },
    select: { farmerId: true },
  });
  return new Set(rows.map((r) => r.farmerId));
}

export async function buyerConnectionApproved(
  buyerId: string,
  farmerUserId: string
): Promise<boolean> {
  const connection = await prisma.connectionRequest.findUnique({
    where: { buyerId_farmerId: { buyerId, farmerId: farmerUserId } },
  });
  return connection?.status === 'ACCEPTED';
}

export async function buyerHasApprovedFarmAccess(
  buyerId: string,
  farmerUserId: string
): Promise<boolean> {
  const [paid, approved] = await Promise.all([
    buyerHasFarmerFarmAccess(buyerId, farmerUserId),
    buyerConnectionApproved(buyerId, farmerUserId),
  ]);
  return paid && approved;
}

export async function buyerHasActiveAccess(buyerId: string): Promise<boolean> {
  const access = await prisma.buyerAccess.findFirst({
    where: { buyerId, status: 'ACTIVE', endDate: { gte: new Date() } },
  });
  return !!access;
}

export async function requireBuyerAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { roleId, userId } = req.user;

  if (isFarmerRole(roleId) || isStaffRole(roleId) || roleId === ROLES.FARMER_HANDLER) {
    return next();
  }

  if (roleId === ROLES.BUYER_HANDLER) {
    const assignment = await prisma.agentAssignment.findFirst({
      where: { agentId: userId, relationshipType: 'BUYER_REPRESENTATIVE' },
    });
    if (assignment && (await buyerHasActiveAccess(assignment.ownerId))) return next();
  }

  if (roleId === ROLES.BUYER && (await buyerHasActiveAccess(userId))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Active buyer access required',
    code: 'ACCESS_REQUIRED',
  });
}

export interface RegisteredCommodity {
  id: number;
  name: string;
  category: string;
  unit?: string;
}

export interface ListingViewContext {
  farmerUser: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    country: string;
    region: string;
    phone?: string;
    email?: string;
    city?: string;
    address?: string | null;
  };
  farmerProfile: {
    farmName: string;
    farmSize: string | null;
    experienceYears: number | null;
  } | null;
  registeredCommodities: RegisteredCommodity[];
}

/** Before farm access: profile pic, name, region, commodity category, registered commodities */
export function maskListing(
  listing: Record<string, unknown>,
  ctx: ListingViewContext,
  extras?: { connectionStatus?: string; farmerAccess?: boolean; hasFarmAccess?: boolean }
) {
  const { farmerUser, registeredCommodities } = ctx;
  const qty = listing.quantity as number;
  const status = listing.status as string;
  const available = status === 'ACTIVE' && qty > 0;

  return {
    id: listing.id,
    region: farmerUser.region,
    country: farmerUser.country,
    location: farmerUser.region,
    city: farmerUser.city,
    farmerName: `${farmerUser.firstName} ${farmerUser.lastName}`,
    farmerId: farmerUser.id,
    profilePicture: farmerUser.profilePicture,
    registeredCommodities,
    status: listing.status,
    createdAt: listing.createdAt,
    available,
    connectionStatus: extras?.connectionStatus ?? 'NONE',
    farmerAccess: extras?.farmerAccess ?? false,
    hasFarmAccess: extras?.hasFarmAccess ?? false,
    _locked: true,
    _unlockHint: 'Pay farm access fee to view products and purchase',
  };
}

/** After farm access approved: full product details */
export function fullListing(
  listing: Record<string, unknown>,
  ctx: ListingViewContext,
  extras?: { connectionStatus?: string; farmerAccess?: boolean; hasFarmAccess?: boolean }
) {
  const { farmerUser, farmerProfile, registeredCommodities } = ctx;
  const images = normalizeImages(listing.images);
  const qty = listing.quantity as number;
  const status = listing.status as string;
  const available = status === 'ACTIVE' && qty > 0;

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    quantity: listing.quantity,
    price: listing.price,
    unit: listing.unit,
    priceLabel: `GHC ${listing.price}/${listing.unit}`,
    quantityLabel: `${listing.quantity} ${listing.unit}`,
    images,
    location: listing.location,
    harvestStartDate: listing.harvestStartDate,
    harvestEndDate: listing.harvestEndDate,
    harvestLabel: listing.harvestLabel,
    region: farmerUser.region,
    country: farmerUser.country,
    status: listing.status,
    createdAt: listing.createdAt,
    commodity: listing.commodity,
    registeredCommodities,
    available,
    connectionStatus: extras?.connectionStatus ?? 'ACCEPTED',
    farmerAccess: extras?.farmerAccess ?? true,
    hasFarmAccess: extras?.hasFarmAccess ?? true,
    farmerName: `${farmerUser.firstName} ${farmerUser.lastName}`,
    farmerId: farmerUser.id,
    profilePicture: farmerUser.profilePicture,
    farmer: {
      id: farmerUser.id,
      name: `${farmerUser.firstName} ${farmerUser.lastName}`,
      email: farmerUser.email,
      phone: farmerUser.phone,
      region: farmerUser.region,
      country: farmerUser.country,
      city: farmerUser.city,
      address: farmerUser.address,
      profilePicture: farmerUser.profilePicture,
      farmName: farmerProfile?.farmName,
      farmSize: farmerProfile?.farmSize,
      experienceYears: farmerProfile?.experienceYears,
    },
    contact: {
      email: farmerUser.email,
      phone: farmerUser.phone,
    },
    _locked: false,
  };
}
