import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';

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
    return prisma.user.findMany({
      where: { verificationStatus: 'PENDING' },
      include: { role: true, farmerProfile: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyUser(userId: string, status: 'VERIFIED' | 'REJECTED') {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: status },
      include: { role: true, farmerProfile: true },
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
