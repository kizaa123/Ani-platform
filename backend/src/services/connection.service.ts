import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import { ROLES, isFarmerRole, isStaffRole } from '../constants/roles';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import {
  notifyConnectionApproved,
  notifyConnectionDeclined,
  notifyConnectionRequest,
  notifyAdminsConnectionRequest,
  getUserDisplayName,
} from './notification.service';

export const connectionSchema = z.object({
  farmerId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
});

const buyerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  region: true,
  city: true,
  country: true,
  profilePicture: true,
  verificationStatus: true,
} as const;

const farmerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  region: true,
  city: true,
  country: true,
  profilePicture: true,
  verificationStatus: true,
  farmerProfile: { select: { farmName: true } },
} as const;

type BuyerRow = {
  profilePicture?: string | null;
  firstName: string;
  lastName: string;
  id: string;
  email: string;
  phone: string;
  region: string;
  city: string | null;
  country: string;
  verificationStatus: string;
};

type FarmerRow = BuyerRow & {
  farmerProfile?: { farmName: string } | null;
};

function mapBuyerProfile(user: BuyerRow) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    region: user.region,
    city: user.city,
    country: user.country,
    profilePicture: normalizePublicAssetUrl(user.profilePicture ?? null),
    verificationStatus: user.verificationStatus,
  };
}

function mapFarmerProfile(user: FarmerRow) {
  return {
    ...mapBuyerProfile(user),
    farmName: user.farmerProfile?.farmName ?? null,
  };
}

export class ConnectionService {
  async create(buyerId: string, data: z.infer<typeof connectionSchema>) {
    const farmer = assertFound(
      await prisma.user.findUnique({ where: { id: data.farmerId } }),
      'Farmer not found'
    );
    assertAuthorized(isFarmerRole(farmer.roleId), 'Target user is not a farmer');

    const existing = await prisma.connectionRequest.findUnique({
      where: { buyerId_farmerId: { buyerId, farmerId: data.farmerId } },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return this.formatConnection(
          await prisma.connectionRequest.findUniqueOrThrow({
            where: { id: existing.id },
            include: {
              buyer: { select: buyerSelect },
              farmer: { select: farmerSelect },
              agent: { select: { id: true, firstName: true, lastName: true } },
            },
          })
        );
      }
      if (existing.status === 'PENDING') {
        throw new AppError(409, 'Access request already pending — wait for ANI admin approval');
      }
      throw new AppError(409, 'Farm access was declined — you cannot request again');
    }

    const created = await prisma.connectionRequest.create({
      data: { buyerId, farmerId: data.farmerId, agentId: data.agentId, status: 'PENDING' },
      include: {
        buyer: { select: buyerSelect },
        farmer: { select: farmerSelect },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const buyerName = `${created.buyer.firstName} ${created.buyer.lastName}`;
    const farmerName = created.farmer
      ? `${created.farmer.firstName} ${created.farmer.lastName}`
      : await getUserDisplayName(data.farmerId);
    await notifyConnectionRequest(data.farmerId, buyerId, buyerName);
    await notifyAdminsConnectionRequest(buyerId, buyerName, data.farmerId, farmerName);

    return this.formatConnection(created);
  }

  private async formatConnections(
    rows: Array<{
      id: string;
      status: string;
      createdAt: Date;
      buyerId: string;
      farmerId: string;
      buyer?: FarmerRow | BuyerRow | null;
      farmer?: FarmerRow | null;
      agent?: { id: string; firstName: string; lastName: string } | null;
    }>
  ) {
    if (rows.length === 0) return [];

    const accessRows = await prisma.buyerFarmerAccess.findMany({
      where: {
        OR: rows.map((r) => ({ buyerId: r.buyerId, farmerId: r.farmerId })),
      },
    });
    const accessMap = new Map(
      accessRows.map((a) => [`${a.buyerId}:${a.farmerId}`, a])
    );

    return rows.map((row) => {
      const access = accessMap.get(`${row.buyerId}:${row.farmerId}`);
      return {
        id: row.id,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        buyer: row.buyer ? mapBuyerProfile(row.buyer as BuyerRow) : undefined,
        farmer: row.farmer ? mapFarmerProfile(row.farmer) : undefined,
        agent: row.agent ?? undefined,
        farmAccess: access
          ? {
              amount: access.amount,
              status: access.status,
              paidAt: access.createdAt.toISOString(),
              paymentMethod: access.paymentMethod,
            }
          : null,
        accessPaid: access?.status === 'COMPLETED',
      };
    });
  }

  private async formatConnection(row: Parameters<ConnectionService['formatConnections']>[0][0]) {
    const [formatted] = await this.formatConnections([row]);
    return formatted;
  }

  async listForBuyer(buyerId: string) {
    const rows = await prisma.connectionRequest.findMany({
      where: { buyerId },
      include: {
        buyer: { select: buyerSelect },
        farmer: { select: farmerSelect },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.formatConnections(rows);
  }

  async listForFarmer(farmerId: string) {
    const rows = await prisma.connectionRequest.findMany({
      where: { farmerId },
      include: {
        buyer: { select: buyerSelect },
        farmer: { select: farmerSelect },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.formatConnections(rows);
  }

  async listForUser(userId: string, roleId: number) {
    if (isFarmerRole(roleId)) {
      const rows = await prisma.connectionRequest.findMany({
        where: { farmerId: userId },
        include: {
          buyer: { select: buyerSelect },
          farmer: { select: farmerSelect },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return this.formatConnections(rows);
    }

    if (roleId === ROLES.BUYER) {
      const rows = await prisma.connectionRequest.findMany({
        where: { buyerId: userId },
        include: {
          buyer: { select: buyerSelect },
          farmer: { select: farmerSelect },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return this.formatConnections(rows);
    }

    if (roleId === ROLES.BUYER_HANDLER) {
      const assignments = await prisma.agentAssignment.findMany({
        where: { agentId: userId, relationshipType: 'BUYER_REPRESENTATIVE' },
      });
      const buyerIds = assignments.map((a) => a.ownerId);
      const rows = await prisma.connectionRequest.findMany({
        where: { buyerId: { in: buyerIds } },
        include: {
          farmer: { select: farmerSelect },
          buyer: { select: buyerSelect },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return this.formatConnections(rows);
    }

    if (roleId === ROLES.FARMER_HANDLER) {
      const assignments = await prisma.agentAssignment.findMany({
        where: { agentId: userId, relationshipType: 'FARMER_REPRESENTATIVE' },
      });
      const farmerIds = assignments.map((a) => a.ownerId);
      const rows = await prisma.connectionRequest.findMany({
        where: { farmerId: { in: farmerIds } },
        include: {
          buyer: { select: buyerSelect },
          farmer: { select: farmerSelect },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return this.formatConnections(rows);
    }

    const rows = await prisma.connectionRequest.findMany({
      include: {
        buyer: { select: buyerSelect },
        farmer: { select: farmerSelect },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.formatConnections(rows);
  }

  async updateStatus(requestId: string, _userId: string, roleId: number, status: 'ACCEPTED' | 'REJECTED') {
    const request = assertFound(
      await prisma.connectionRequest.findUnique({ where: { id: requestId } }),
      'Connection request not found'
    );

    assertAuthorized(isStaffRole(roleId), 'Only ANI staff can approve or reject farm access requests');

    const updated = await prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        buyer: { select: buyerSelect },
        farmer: { select: farmerSelect },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const farmerName = updated.farmer
      ? `${updated.farmer.firstName} ${updated.farmer.lastName}`
      : await getUserDisplayName(updated.farmerId);

    if (status === 'ACCEPTED') {
      await notifyConnectionApproved(updated.buyerId, updated.farmerId, farmerName);
    } else {
      await notifyConnectionDeclined(updated.buyerId, updated.farmerId, farmerName);
    }

    return this.formatConnection(updated);
  }
}

export const connectionService = new ConnectionService();
