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
  researcherProfile: { select: { institution: true, expertise: true } },
} as const;

export class AdminService {
  async getFinancialStatement() {
    const [productOrders, farmAccess, researchPurchases, accessPayments] = await Promise.all([
      prisma.productOrder.findMany({
        where: { status: 'PAID' },
        include: {
          buyer: { select: { firstName: true, lastName: true } },
          farmer: { select: { firstName: true, lastName: true, farmerProfile: { select: { farmName: true } } } },
          listing: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.buyerFarmerAccess.findMany({
        where: { status: 'COMPLETED' },
        include: {
          buyer: { select: { firstName: true, lastName: true } },
          farmer: {
            select: {
              firstName: true,
              lastName: true,
              farmerProfile: { select: { farmName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.researchPurchase.findMany({
        where: { status: 'COMPLETED' },
        include: {
          student: { select: { firstName: true, lastName: true } },
          researcher: { select: { firstName: true, lastName: true } },
          publication: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        include: {
          user: { select: { firstName: true, lastName: true } },
          package: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const productLineItems = productOrders.map((order) => ({
      id: order.id,
      date: order.createdAt.toISOString(),
      type: 'PRODUCT_ORDER' as const,
      description: order.listing.title,
      partyName: `${order.buyer.firstName} ${order.buyer.lastName} → ${order.farmer.farmerProfile?.farmName ?? `${order.farmer.firstName} ${order.farmer.lastName}`}`,
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      transactionId: order.transactionId,
    }));

    const farmAccessLineItems = farmAccess.map((access) => ({
      id: access.id,
      date: access.createdAt.toISOString(),
      type: 'FARM_ACCESS' as const,
      description: `Farm access: ${access.farmer.farmerProfile?.farmName ?? `${access.farmer.firstName} ${access.farmer.lastName}`}`,
      partyName: `${access.buyer.firstName} ${access.buyer.lastName}`,
      amount: access.amount,
      paymentMethod: access.paymentMethod,
      status: access.status,
      transactionId: access.transactionId,
    }));

    const researchLineItems = researchPurchases.map((purchase) => ({
      id: purchase.id,
      date: purchase.createdAt.toISOString(),
      type: 'RESEARCH_SALE' as const,
      description: purchase.publication.title,
      partyName: `${purchase.student.firstName} ${purchase.student.lastName} → ${purchase.researcher.firstName} ${purchase.researcher.lastName}`,
      amount: purchase.amount,
      paymentMethod: purchase.paymentMethod,
      status: purchase.status,
      transactionId: purchase.transactionId,
    }));

    const accessPackageLineItems = accessPayments.map((payment) => ({
      id: payment.id,
      date: payment.createdAt.toISOString(),
      type: 'ACCESS_PACKAGE' as const,
      description: payment.package.name,
      partyName: `${payment.user.firstName} ${payment.user.lastName}`,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId,
    }));

    const lineItems = [
      ...productLineItems,
      ...farmAccessLineItems,
      ...researchLineItems,
      ...accessPackageLineItems,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const productOrderRevenue = productLineItems.reduce((sum, item) => sum + item.amount, 0);
    const farmAccessRevenue = farmAccessLineItems.reduce((sum, item) => sum + item.amount, 0);
    const researchRevenue = researchLineItems.reduce((sum, item) => sum + item.amount, 0);
    const accessPackageRevenue = accessPackageLineItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: productOrderRevenue + farmAccessRevenue + researchRevenue + accessPackageRevenue,
        productOrderRevenue,
        farmAccessRevenue,
        researchRevenue,
        accessPackageRevenue,
        transactionCount: lineItems.length,
        productOrderCount: productLineItems.length,
        farmAccessCount: farmAccessLineItems.length,
        researchSaleCount: researchLineItems.length,
        accessPackageCount: accessPackageLineItems.length,
      },
      lineItems,
    };
  }

  async getStats() {
    const [users, farmers, buyers, listings, connections, financials] = await Promise.all([
      prisma.user.count(),
      prisma.farmerProfile.count(),
      prisma.buyerProfile.count(),
      prisma.commodityListing.count({ where: { status: 'ACTIVE' } }),
      prisma.connectionRequest.count({ where: { status: 'ACCEPTED' } }),
      this.getFinancialStatement(),
    ]);

    return {
      users,
      farmers,
      buyers,
      listings,
      totalRevenue: financials.summary.totalRevenue,
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

    if (!(VERIFIABLE_ROLE_IDS as readonly number[]).includes(existing.roleId)) {
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
