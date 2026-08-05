import { z } from 'zod';
import prisma from '../database/prisma';
import { assertFound, assertAuthorized } from '../utils/errors';
import {
  ROLES,
  isFarmerHandler,
  isBuyerHandler,
  isFarmerRole,
  FARMER_ROLES,
  CLIENT_ROLES,
  PORTAL_DIRECTORY_ROLES,
  portalDirectoryRoleLabel,
} from '../constants/roles';
import { AppError } from '../utils/errors';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { farmService, notifyClientSchema } from './farm.service';
import {
  notifyFarmProductsAvailable,
  notifyHandlerFarmProductsAvailable,
} from './notification.service';
import { buyerService } from './buyer.service';
import { connectionService } from './connection.service';
import { buyerHasActiveAccess } from '../middleware/access.middleware';
import {
  fetchDistributedLines,
  fetchHandlerDistributionLines,
  mapDistributionToHandlerPayment,
  mapDistributionToHandlerPendingLine,
} from '../utils/distributionFinancials';
import { formatVerificationTags, verificationTagSelect } from '../utils/verificationTags';
import { enrichOrdersWithCounterpartHandler } from '../utils/counterpartHandler';

export const assignmentSchema = z.object({
  ownerId: z.string().uuid(),
});

export class AgentService {
  async listHandlers(type: 'farmer' | 'buyer') {
    const roleId = type === 'farmer' ? ROLES.FARMER_HANDLER : ROLES.BUYER_HANDLER;
    const rows = await prisma.user.findMany({
      where: { roleId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        region: true,
        city: true,
        profilePicture: true,
        updatedAt: true,
        verificationStatus: true,
        verificationTags: { select: verificationTagSelect },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return rows.map((handler) => ({
      id: handler.id,
      firstName: handler.firstName,
      lastName: handler.lastName,
      email: handler.email,
      phone: handler.phone,
      country: handler.country,
      region: handler.region,
      city: handler.city,
      profilePicture: normalizePublicAssetUrl(handler.profilePicture),
      updatedAt: handler.updatedAt.toISOString(),
      verificationStatus: handler.verificationStatus,
      verificationTags: formatVerificationTags(handler.verificationTags ?? []),
    }));
  }

  async getProfile(userId: string) {
    return assertFound(
      await prisma.agentProfile.findUnique({
        where: { userId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
      }),
      'Agent profile not found'
    );
  }

  async listClients(userId: string, roleId: number) {
    assertAuthorized(
      isFarmerHandler(roleId) || isBuyerHandler(roleId),
      'Only liaison officers can list clients'
    );
    const clients = await prisma.user.findMany({
      where: {
        roleId: { in: [...PORTAL_DIRECTORY_ROLES] },
        id: { not: userId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        city: true,
        region: true,
        country: true,
        roleId: true,
        verificationStatus: true,
        verificationTags: { select: verificationTagSelect },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return clients.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      profilePicture: normalizePublicAssetUrl(c.profilePicture),
      city: c.city,
      region: c.region,
      country: c.country,
      roleId: c.roleId,
      roleLabel: portalDirectoryRoleLabel(c.roleId),
      verificationStatus: c.verificationStatus,
      verificationTags: formatVerificationTags(c.verificationTags),
    }));
  }

  async notifyClient(
    agentId: string,
    roleId: number,
    data: z.infer<typeof notifyClientSchema>
  ) {
    assertAuthorized(
      isFarmerHandler(roleId) || isBuyerHandler(roleId),
      'Only liaison officers can notify clients'
    );
    const client = assertFound(
      await prisma.user.findFirst({
        where: { id: data.clientId, roleId: { in: [...PORTAL_DIRECTORY_ROLES] } },
        select: { id: true },
      }),
      'Client not found'
    );

    if (isFarmerHandler(roleId)) {
      const assignment = await prisma.agentAssignment.findFirst({
        where: { agentId, relationshipType: 'FARMER_REPRESENTATIVE' },
        select: { ownerId: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!assignment) {
        throw new AppError(400, 'Assign a fellow farmer before notifying clients');
      }
      await notifyFarmProductsAvailable({
        farmerUserId: assignment.ownerId,
        clientId: client.id,
        customMessage: data.message,
      });
    } else {
      await notifyHandlerFarmProductsAvailable({
        handlerUserId: agentId,
        clientId: client.id,
        customMessage: data.message,
      });
    }

    return { success: true };
  }

  async getAssignments(agentId: string, roleId: number) {
    const normalizedRoleId = Number(roleId);
    assertAuthorized(
      isFarmerHandler(normalizedRoleId) || isBuyerHandler(normalizedRoleId),
      'Handlers only'
    );

    const relationshipType = isFarmerHandler(normalizedRoleId)
      ? 'FARMER_REPRESENTATIVE'
      : 'BUYER_REPRESENTATIVE';

    const rows = await prisma.agentAssignment.findMany({
      where: { agentId, relationshipType },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePicture: true,
            updatedAt: true,
            country: true,
            region: true,
            city: true,
            roleId: true,
            verificationStatus: true,
            verificationTags: { select: verificationTagSelect },
            role: { select: { roleName: true } },
            farmerProfile: {
              select: {
                farmName: true,
                farmSize: true,
                experienceYears: true,
                farmerCommodities: {
                  include: {
                    commodity: { include: { category: true } },
                  },
                },
              },
            },
            buyerProfile: { select: { company: true } },
            researcherProfile: { select: { institution: true, expertise: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      relationshipType: row.relationshipType,
      createdAt: row.createdAt.toISOString(),
      owner: {
        id: row.owner.id,
        firstName: row.owner.firstName,
        lastName: row.owner.lastName,
        email: row.owner.email,
        phone: row.owner.phone,
        profilePicture: normalizePublicAssetUrl(row.owner.profilePicture),
        updatedAt: row.owner.updatedAt.toISOString(),
        country: row.owner.country,
        region: row.owner.region,
        city: row.owner.city,
        roleId: row.owner.roleId,
        verificationStatus: row.owner.verificationStatus,
        verificationTags: formatVerificationTags(row.owner.verificationTags ?? []),
        role: row.owner.role,
        farmerProfile: row.owner.farmerProfile
          ? {
              farmName: row.owner.farmerProfile.farmName,
              farmSize: row.owner.farmerProfile.farmSize,
              experienceYears: row.owner.farmerProfile.experienceYears,
            }
          : null,
        buyerProfile: row.owner.buyerProfile,
        researcherProfile: row.owner.researcherProfile,
        isFarmer: FARMER_ROLES.includes(row.owner.roleId as typeof ROLES.CROP_FARMER),
        commodities:
          row.owner.farmerProfile?.farmerCommodities.map((fc) => ({
            id: fc.commodity.id,
            name: fc.commodity.name,
            category: fc.commodity.category.name,
          })) ?? [],
      },
    }));
  }

  async getClientFarm(agentId: string, roleId: number, ownerId: string) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Handlers only');

    const assignment = assertFound(
      await prisma.agentAssignment.findFirst({
        where: { agentId, ownerId },
      }),
      'This client is not assigned to you'
    );

    const owner = assertFound(
      await prisma.user.findUnique({
        where: { id: ownerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profilePicture: true,
          updatedAt: true,
          country: true,
          region: true,
          city: true,
          address: true,
          roleId: true,
          verificationStatus: true,
          verificationTags: { select: verificationTagSelect },
          role: { select: { roleName: true } },
          farmerProfile: {
            include: {
              farmerCommodities: {
                include: { commodity: { include: { category: true } } },
              },
            },
          },
          buyerProfile: { select: { company: true, industry: true } },
        },
      }),
      'Client not found'
    );

    if (assignment.relationshipType === 'FARMER_REPRESENTATIVE') {
      if (!isFarmerRole(owner.roleId) || !owner.farmerProfile) {
        throw new AppError(400, 'Assigned client is not a farmer');
      }

      const profile = owner.farmerProfile;

      return {
        assignmentId: assignment.id,
        relationshipType: assignment.relationshipType,
        clientType: 'farmer' as const,
        farmer: {
          id: owner.id,
          name: `${owner.firstName} ${owner.lastName}`,
          email: owner.email,
          phone: owner.phone,
          profilePicture: normalizePublicAssetUrl(owner.profilePicture),
          updatedAt: owner.updatedAt.toISOString(),
          country: owner.country,
          region: owner.region,
          city: owner.city,
          address: owner.address,
          verificationStatus: owner.verificationStatus,
          verificationTags: formatVerificationTags(owner.verificationTags ?? []),
          role: owner.role.roleName,
          farmName: profile.farmName,
          farmSize: profile.farmSize,
          experienceYears: profile.experienceYears,
          commodities: profile.farmerCommodities.map((fc) => ({
            id: fc.commodity.id,
            name: fc.commodity.name,
            category: fc.commodity.category.name,
            unit: fc.unit,
          })),
        },
        products: [],
        productCount: 0,
      };
    }

    return {
      assignmentId: assignment.id,
      relationshipType: assignment.relationshipType,
      clientType: 'buyer' as const,
      buyer: {
        id: owner.id,
        name: `${owner.firstName} ${owner.lastName}`,
        email: owner.email,
        phone: owner.phone,
        profilePicture: normalizePublicAssetUrl(owner.profilePicture),
        updatedAt: owner.updatedAt.toISOString(),
        country: owner.country,
        region: owner.region,
        city: owner.city,
        address: owner.address,
        company: owner.buyerProfile?.company ?? null,
        industry: owner.buyerProfile?.industry ?? null,
        verificationStatus: owner.verificationStatus,
        verificationTags: formatVerificationTags(owner.verificationTags ?? []),
        role: owner.role.roleName,
      },
      stats: await this.buildBuyerClientStats(ownerId),
    };
  }

  private async buildBuyerClientStats(buyerId: string) {
    const [orderStats, farmAccess, connections, hasPlatformAccess] = await Promise.all([
      prisma.productOrder.findMany({
        where: { buyerId },
        select: { status: true, totalAmount: true },
      }),
      prisma.buyerFarmerAccess.findMany({
        where: { buyerId, status: 'COMPLETED' },
        include: {
          farmer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              farmerProfile: { select: { farmName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.connectionRequest.findMany({
        where: { buyerId },
        select: { status: true },
      }),
      buyerHasActiveAccess(buyerId),
    ]);

    const paidOrders = orderStats.filter((o) => o.status === 'PAID');
    const totalProductSpend = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalFarmAccessSpend = farmAccess.reduce((sum, a) => sum + a.amount, 0);

    return {
      totalOrders: orderStats.length,
      paidOrders: paidOrders.length,
      totalProductSpend,
      totalFarmAccessSpend,
      totalSpent: totalProductSpend + totalFarmAccessSpend,
      farmsAccessed: farmAccess.length,
      acceptedConnections: connections.filter((c) => c.status === 'ACCEPTED').length,
      pendingConnections: connections.filter((c) => c.status === 'PENDING').length,
      hasPlatformAccess,
      farmAccess: farmAccess.map((access) => ({
        id: access.id,
        farmerId: access.farmer.id,
        farmerName: `${access.farmer.firstName} ${access.farmer.lastName}`,
        farmName: access.farmer.farmerProfile?.farmName ?? null,
        amount: access.amount,
        paidAt: access.createdAt.toISOString(),
      })),
    };
  }

  async getClientConnections(agentId: string, roleId: number, ownerId: string) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Handlers only');
    throw new AppError(403, 'Liaison officers cannot view client connections');
  }

  async createAssignment(agentId: string, roleId: number, ownerId: string) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Only handlers can create assignments');

    assertFound(await prisma.user.findUnique({ where: { id: ownerId } }), 'Owner not found');

    const relationshipType = isFarmerHandler(roleId)
      ? 'FARMER_REPRESENTATIVE'
      : 'BUYER_REPRESENTATIVE';

    const existing = await prisma.agentAssignment.findFirst({
      where: { ownerId, relationshipType },
    });
    if (existing) {
      throw new AppError(
        409,
        'This user already has a handler assigned. They must change their handler in profile settings.'
      );
    }

    return prisma.agentAssignment.create({
      data: { agentId, ownerId, relationshipType },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    });
  }

  async removeAssignment(agentId: string, assignmentId: string) {
    const assignment = assertFound(
      await prisma.agentAssignment.findFirst({ where: { id: assignmentId, agentId } }),
      'Assignment not found'
    );
    await prisma.agentAssignment.delete({ where: { id: assignment.id } });
  }

  private async assertClientAssignment(agentId: string, ownerId: string) {
    return assertFound(
      await prisma.agentAssignment.findFirst({
        where: { agentId, ownerId },
      }),
      'This client is not assigned to you'
    );
  }

  private async assertBuyerClientAssignment(agentId: string, ownerId: string) {
    const assignment = assertFound(
      await prisma.agentAssignment.findFirst({
        where: { agentId, ownerId, relationshipType: 'BUYER_REPRESENTATIVE' },
      }),
      'This buyer client is not assigned to you'
    );

    const owner = assertFound(
      await prisma.user.findUnique({ where: { id: ownerId }, select: { roleId: true } }),
      'Client not found'
    );

    if (!CLIENT_ROLES.includes(owner.roleId as typeof ROLES.BUYER)) {
      throw new AppError(400, 'Assigned client is not a buyer or researcher');
    }

    return assignment;
  }

  private async assertFarmerClientAssignment(agentId: string, ownerId: string) {
    const assignment = assertFound(
      await prisma.agentAssignment.findFirst({
        where: { agentId, ownerId, relationshipType: 'FARMER_REPRESENTATIVE' },
      }),
      'This farmer client is not assigned to you'
    );

    const owner = assertFound(
      await prisma.user.findUnique({ where: { id: ownerId }, select: { roleId: true } }),
      'Client not found'
    );

    if (!isFarmerRole(owner.roleId)) {
      throw new AppError(400, 'Orders and financials are only available for farmer clients');
    }

    return assignment;
  }

  async getClientOrders(agentId: string, roleId: number, ownerId: string) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Handlers only');

    const assignment = await this.assertClientAssignment(agentId, ownerId);

    if (assignment.relationshipType === 'FARMER_REPRESENTATIVE') {
      await this.assertFarmerClientAssignment(agentId, ownerId);
      const orders = await farmService.fetchFarmerOrders(ownerId);
      return enrichOrdersWithCounterpartHandler(orders, 'BUYER_REPRESENTATIVE', 'buyerId');
    }

    await this.assertBuyerClientAssignment(agentId, ownerId);
    const orders = await buyerService.fetchOrdersForBuyer(ownerId);
    const sanitizedOrders = orders.map((order) => ({
      ...order,
      canRelease: false,
      releaseOtp: null,
    }));
    return enrichOrdersWithCounterpartHandler(sanitizedOrders, 'FARMER_REPRESENTATIVE', 'farmerId');
  }

  async updateClientOrderTrack(
    agentId: string,
    roleId: number,
    ownerId: string,
    orderId: string,
    trackStage: import('../constants/orderTrack').OrderTrackStage
  ) {
    assertAuthorized(isFarmerHandler(roleId), 'Only farmer handlers can update order tracking');
    await this.assertFarmerClientAssignment(agentId, ownerId);
    return farmService.updateOrderTrack(ownerId, orderId, trackStage);
  }

  async getClientFinancialStatement(agentId: string, roleId: number, ownerId: string) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Handlers only');

    const assignment = await this.assertClientAssignment(agentId, ownerId);

    if (assignment.relationshipType === 'FARMER_REPRESENTATIVE') {
      if (isFarmerHandler(roleId)) {
        throw new AppError(403, 'Farmer handlers cannot view farmer financials');
      }
      await this.assertFarmerClientAssignment(agentId, ownerId);
      return farmService.buildFinancialStatement(ownerId);
    }

    await this.assertBuyerClientAssignment(agentId, ownerId);
    if (isBuyerHandler(roleId)) {
      throw new AppError(403, 'Client liaison officers cannot view buyer financials');
    }
    return buyerService.buildFinancialStatementForBuyer(ownerId);
  }

  async getFinancialStatement(agentId: string, roleId: number) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Handlers only');

    const agent = assertFound(
      await prisma.user.findUnique({
        where: { id: agentId },
        select: { firstName: true, lastName: true },
      }),
      'Handler not found'
    );

    const relationshipType = isFarmerHandler(roleId)
      ? 'FARMER_REPRESENTATIVE'
      : 'BUYER_REPRESENTATIVE';

    const clientCount = await prisma.agentAssignment.count({
      where: { agentId, relationshipType },
    });

    const handlerRole = relationshipType === 'FARMER_REPRESENTATIVE' ? 'FARMER_HANDLER' : 'BUYER_HANDLER';
    const [distributedLines, pendingLines] = await Promise.all([
      fetchDistributedLines(agentId, [handlerRole]),
      fetchHandlerDistributionLines(agentId, [handlerRole], ['PENDING']),
    ]);
    const handlerPayments = distributedLines.map(mapDistributionToHandlerPayment);
    const pendingDistributions = pendingLines.map(mapDistributionToHandlerPendingLine);
    const totalRevenue = handlerPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingDistributionTotal = pendingDistributions.reduce(
      (sum, line) => sum + line.shareAmount,
      0
    );

    return {
      agentName: `${agent.firstName} ${agent.lastName}`,
      handlerType: relationshipType === 'FARMER_REPRESENTATIVE' ? ('farmer' as const) : ('buyer' as const),
      generatedAt: new Date().toISOString(),
      summary: {
        clientCount,
        totalRevenue,
        totalSalesCount: handlerPayments.length,
        transactionCount: handlerPayments.length,
        pendingDistributionCount: pendingDistributions.length,
        pendingDistributionTotal,
      },
      transactions: handlerPayments,
      handlerPayments,
      pendingDistributions,
    };
  }
}

export const agentService = new AgentService();
