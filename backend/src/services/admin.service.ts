import { z } from 'zod';
import { VerificationStatus } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';
import { STAFF_ROLES, VERIFIABLE_ROLE_IDS } from '../constants/roles';

export const verifyUserSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
});

const verifiableUserInclude = {
  role: true,
  farmerProfile: { select: { farmName: true, verificationStatus: true } },
  buyerProfile: { select: { company: true } },
  agentProfile: { select: { agentType: true } },
} as const;

export class AdminService {
  async getStats() {
    const [users, farmers, buyers, listings, payments, connections] = await Promise.all([
      prisma.user.count(),
      prisma.farmerProfile.count(),
      prisma.buyerProfile.count(),
      prisma.commodityListing.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
      prisma.connectionRequest.count({ where: { status: 'ACCEPTED' } }),
    ]);

    return {
      users,
      farmers,
      buyers,
      listings,
      totalRevenue: payments._sum.amount ?? 0,
      activeConnections: connections,
    };
  }

  async getPendingUsers() {
    return this.getVerifiableUsers({ status: 'PENDING' });
  }

  async getVerifiableUsers(filters?: { status?: VerificationStatus; roleId?: number }) {
    const roleFilter = filters?.roleId
      ? { roleId: filters.roleId }
      : { roleId: { in: VERIFIABLE_ROLE_IDS } };

    return prisma.user.findMany({
      where: {
        ...roleFilter,
        ...(filters?.status ? { verificationStatus: filters.status } : {}),
      },
      include: verifiableUserInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyUser(userId: string, status: VerificationStatus) {
    const existing = assertFound(
      await prisma.user.findUnique({
        where: { id: userId },
        include: { farmerProfile: true },
      }),
      'User not found'
    );

    if (STAFF_ROLES.includes(existing.roleId as (typeof STAFF_ROLES)[number])) {
      throw new AppError(403, 'Staff accounts cannot be verified through this endpoint');
    }

    if (!VERIFIABLE_ROLE_IDS.includes(existing.roleId)) {
      throw new AppError(400, 'Only buyers, farmers, and handlers can be verified');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: status },
      include: verifiableUserInclude,
    });

    if (user.farmerProfile) {
      await prisma.farmerProfile.update({
        where: { userId },
        data: { verificationStatus: status },
      });
    }

    return user;
  }

  async getAuditLogs(limit = 100) {
    return prisma.auditLog.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const adminService = new AdminService();
