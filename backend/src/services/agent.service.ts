import { z } from 'zod';
import prisma from '../database/prisma';
import { assertFound, assertAuthorized } from '../utils/errors';
import { ROLES, isFarmerHandler, isBuyerHandler, isFarmerRole, FARMER_ROLES } from '../constants/roles';
import { AppError } from '../utils/errors';
import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { formatHarvestLabel, toHarvestDateInput } from '../utils/harvest';
import { farmService } from './farm.service';
import { buyerService } from './buyer.service';
import { connectionService } from './connection.service';
import { buyerHasActiveAccess } from '../middleware/access.middleware';

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

  async getAssignments(agentId: string) {
    const rows = await prisma.agentAssignment.findMany({
      where: { agentId },
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
        role: row.owner.role,
        farmerProfile: row.owner.farmerProfile
          ? {
              farmName: row.owner.farmerProfile.farmName,
              farmSize: row.owner.farmerProfile.farmSize,
              experienceYears: row.owner.farmerProfile.experienceYears,
            }
          : null,
        buyerProfile: row.owner.buyerProfile,
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
          role: { select: { roleName: true } },
          farmerProfile: {
            include: {
              farmerCommodities: {
                include: { commodity: { include: { category: true } } },
              },
              listings: {
                where: { status: { in: ['ACTIVE', 'SOLD'] } },
                include: { commodity: { include: { category: true } } },
                orderBy: { createdAt: 'desc' },
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
      const products = profile.listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        quantity: listing.quantity,
        price: listing.price,
        unit: listing.unit,
        priceLabel: `GHC ${listing.price}/${listing.unit}`,
        quantityLabel: `${listing.quantity} ${listing.unit}`,
        images: normalizeImages(listing.images),
        location: listing.location,
        harvestStartDate: toHarvestDateInput(listing.harvestStartDate),
        harvestEndDate: toHarvestDateInput(listing.harvestEndDate),
        harvestLabel: formatHarvestLabel(listing.harvestStartDate, listing.harvestEndDate),
        status: listing.status,
        available: listing.status === 'ACTIVE' && listing.quantity > 0,
        commodity: listing.commodity,
        createdAt: listing.createdAt.toISOString(),
      }));

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
        products,
        productCount: products.length,
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

    const assignment = await this.assertClientAssignment(agentId, ownerId);

    if (assignment.relationshipType === 'BUYER_REPRESENTATIVE') {
      const owner = assertFound(
        await prisma.user.findUnique({ where: { id: ownerId }, select: { roleId: true } }),
        'Client not found'
      );
      if (owner.roleId !== ROLES.BUYER) {
        throw new AppError(400, 'Assigned client is not a buyer');
      }
      return connectionService.listForBuyer(ownerId);
    }

    await this.assertFarmerClientAssignment(agentId, ownerId);
    return connectionService.listForFarmer(ownerId);
  }

  async createAssignment(agentId: string, roleId: number, ownerId: string) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Only handlers can create assignments');

    assertFound(await prisma.user.findUnique({ where: { id: ownerId } }), 'Owner not found');

    const relationshipType = isFarmerHandler(roleId)
      ? 'FARMER_REPRESENTATIVE'
      : 'BUYER_REPRESENTATIVE';

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

    if (owner.roleId !== ROLES.BUYER) {
      throw new AppError(400, 'Assigned client is not a buyer');
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
      return farmService.fetchFarmerOrders(ownerId);
    }

    await this.assertBuyerClientAssignment(agentId, ownerId);
    return buyerService.fetchOrdersForBuyer(ownerId);
  }

  async updateClientOrderTrack(
    agentId: string,
    roleId: number,
    ownerId: string,
    buyerId: string,
    listingId: string,
    trackStage: import('../constants/orderTrack').OrderTrackStage
  ) {
    assertAuthorized(isFarmerHandler(roleId), 'Only farmer handlers can update order tracking');
    await this.assertFarmerClientAssignment(agentId, ownerId);
    return farmService.updateOrderTrack(ownerId, buyerId, listingId, trackStage);
  }

  async getClientFinancialStatement(agentId: string, roleId: number, ownerId: string) {
    assertAuthorized(isFarmerHandler(roleId) || isBuyerHandler(roleId), 'Handlers only');

    const assignment = await this.assertClientAssignment(agentId, ownerId);

    if (assignment.relationshipType === 'FARMER_REPRESENTATIVE') {
      await this.assertFarmerClientAssignment(agentId, ownerId);
      return farmService.buildFinancialStatement(ownerId);
    }

    await this.assertBuyerClientAssignment(agentId, ownerId);
    return buyerService.buildFinancialStatementForBuyer(ownerId);
  }
}

export const agentService = new AgentService();
