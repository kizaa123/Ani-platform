import { z } from 'zod';
import { VerificationStatus } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';
import { accountantService } from './accountant.service';
import {
  ROLES,
  FARMER_ROLES,
  STAFF_ROLES,
  VERIFIABLE_ROLE_IDS,
} from '../constants/roles';
import {
  notifyInternationalVerification,
  notifyUserVerified,
} from './notification.service';
import { publicationPlatformShareAmount } from '../utils/distributionFinancials';

const CHART_MONTHS = 6;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function chartMonthLabels(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function chartStartDate(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - (months - 1));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function countByMonth<T extends { createdAt: Date }>(
  rows: T[],
  monthKeys: string[]
): number[] {
  const counts = new Map(monthKeys.map((k) => [k, 0]));
  for (const row of rows) {
    const key = monthKey(row.createdAt);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return monthKeys.map((k) => counts.get(k) ?? 0);
}

function sumByMonth<T extends { createdAt: Date; amount: number }>(
  rows: T[],
  monthKeys: string[]
): number[] {
  const sums = new Map(monthKeys.map((k) => [k, 0]));
  for (const row of rows) {
    const key = monthKey(row.createdAt);
    if (sums.has(key)) sums.set(key, (sums.get(key) ?? 0) + row.amount);
  }
  return monthKeys.map((k) => sums.get(k) ?? 0);
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

const ROLE_CHART_LABELS: Record<number, string> = {
  [ROLES.CROP_FARMER]: 'Crop Fellow',
  [ROLES.LIVESTOCK_FARMER]: 'Livestock Fellow',
  [ROLES.ORGANIZATION_FARMER]: 'Organization Fellow',
  [ROLES.FARMER_HANDLER]: 'Fellow Liaison Officer',
  [ROLES.BUYER]: 'Client',
  [ROLES.BUYER_HANDLER]: 'Client Liaison Officer',
  [ROLES.ANI_ACCOUNTANT]: 'Accountants',
  [ROLES.ADMIN]: 'Admins',
  [ROLES.CTO]: 'CTO',
  [ROLES.COMMUNICATION_OFFICER]: 'Communications',
  [ROLES.RESEARCHER]: 'Researchers',
  [ROLES.STUDENT]: 'Students',
};

export const verifyUserSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
});

export const assignVerificationTagSchema = z.object({
  tagType: z.enum(['STANDARD', 'INTERNATIONAL_FARMER', 'INTERNATIONAL_BUYER']),
});

const verifiableUserInclude = {
  role: true,
  verificationTags: true,
  farmerProfile: { select: { farmName: true, verificationStatus: true } },
  buyerProfile: { select: { company: true } },
  agentProfile: { select: { agentType: true } },
  researcherProfile: { select: { institution: true, expertise: true } },
} as const;

export class AdminService {
  async getFinancialStatement() {
    const [productOrders, farmAccess, researchPurchases] = await Promise.all([
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
      escrowStatus: order.escrowStatus,
      otpVerifiedAt: order.otpVerifiedAt?.toISOString() ?? null,
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
      grossAmount: purchase.amount,
      amount: publicationPlatformShareAmount(purchase.amount),
      paymentMethod: purchase.paymentMethod,
      status: purchase.status,
      transactionId: purchase.transactionId,
    }));

    const lineItems = [
      ...productLineItems,
      ...farmAccessLineItems,
      ...researchLineItems,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const productOrderRevenue = productLineItems.reduce((sum, item) => sum + item.amount, 0);
    const farmAccessRevenue = farmAccessLineItems.reduce((sum, item) => sum + item.amount, 0);
    const researchRevenue = researchLineItems.reduce((sum, item) => sum + item.amount, 0);
    const researchGrossSales = researchLineItems.reduce(
      (sum, item) => sum + (item.grossAmount ?? item.amount),
      0
    );

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: productOrderRevenue + farmAccessRevenue + researchRevenue,
        productOrderRevenue,
        farmAccessRevenue,
        researchRevenue,
        researchGrossSales,
        transactionCount: lineItems.length,
        productOrderCount: productLineItems.length,
        farmAccessCount: farmAccessLineItems.length,
        researchSaleCount: researchLineItems.length,
      },
      lineItems,
    };
  }

  async getStats() {
    const [
      users,
      farmers,
      buyers,
      buyerHandlers,
      farmerHandlers,
      listings,
      activeConnections,
      pendingVerifications,
      pendingConnections,
      pendingAccountantApprovals,
      productRevenue,
      farmAccessRevenue,
      researchRevenue,
      accessPaymentRevenue,
      platformIncome,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { roleId: { in: [...FARMER_ROLES] } } }),
      prisma.user.count({ where: { roleId: ROLES.BUYER } }),
      prisma.user.count({ where: { roleId: ROLES.BUYER_HANDLER } }),
      prisma.user.count({ where: { roleId: ROLES.FARMER_HANDLER } }),
      prisma.commodityListing.count({ where: { status: 'ACTIVE' } }),
      prisma.connectionRequest.count({ where: { status: 'ACCEPTED' } }),
      prisma.user.count({
        where: {
          verificationStatus: 'PENDING',
          roleId: { in: [...VERIFIABLE_ROLE_IDS] },
        },
      }),
      prisma.connectionRequest.count({ where: { status: 'PENDING' } }),
      prisma.user.count({
        where: {
          roleId: ROLES.ANI_ACCOUNTANT,
          verificationStatus: 'PENDING',
        },
      }),
      prisma.productOrder.aggregate({
        where: { status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      prisma.buyerFarmerAccess.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.researchPurchase.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      accountantService.getPlatformIncome(),
    ]);

    const totalRevenue =
      (productRevenue._sum.totalAmount ?? 0) +
      (farmAccessRevenue._sum.amount ?? 0) +
      (researchRevenue._sum.amount ?? 0) +
      (accessPaymentRevenue._sum.amount ?? 0);

    return {
      users,
      farmers,
      buyers,
      buyerHandlers,
      farmerHandlers,
      listings,
      totalRevenue,
      activeConnections,
      pendingVerifications,
      pendingConnections,
      pendingAccountantApprovals,
      accessIncome: platformIncome.accessRevenue,
      orderShareIncome: platformIncome.orderShareRevenue,
      totalPlatformIncome: platformIncome.totalRevenue,
      accessPaymentCount: platformIncome.accessPaymentCount,
      orderShareCount: platformIncome.orderShareCount,
    };
  }

  async getDashboardCharts() {
    const monthKeys = chartMonthLabels(CHART_MONTHS);
    const startDate = chartStartDate(CHART_MONTHS);

    const [
      newUsers,
      usersBeforeWindow,
      paidOrders,
      completedFarmAccess,
      completedResearch,
      completedPayments,
      roleCounts,
      verificationCounts,
      recentUsers,
      recentOrders,
      recentConnections,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      prisma.user.count({ where: { createdAt: { lt: startDate } } }),
      prisma.productOrder.findMany({
        where: { createdAt: { gte: startDate }, status: 'PAID' },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.buyerFarmerAccess.findMany({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        select: { createdAt: true, amount: true },
      }),
      prisma.researchPurchase.findMany({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        select: { createdAt: true, amount: true },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        select: { createdAt: true, amount: true },
      }),
      prisma.user.groupBy({
        by: ['roleId'],
        _count: { id: true },
      }),
      prisma.user.groupBy({
        by: ['verificationStatus'],
        where: { roleId: { in: [...VERIFIABLE_ROLE_IDS] } },
        _count: { id: true },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          role: { select: { roleName: true } },
        },
      }),
      prisma.productOrder.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          listing: { select: { title: true } },
        },
      }),
      prisma.connectionRequest.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          buyer: { select: { firstName: true, lastName: true } },
          farmer: {
            select: {
              firstName: true,
              lastName: true,
              farmerProfile: { select: { farmName: true } },
            },
          },
        },
      }),
    ]);

    const revenueRows = [
      ...paidOrders.map((o) => ({ createdAt: o.createdAt, amount: o.totalAmount })),
      ...completedFarmAccess.map((a) => ({ createdAt: a.createdAt, amount: a.amount })),
      ...completedResearch.map((r) => ({ createdAt: r.createdAt, amount: r.amount })),
      ...completedPayments.map((p) => ({ createdAt: p.createdAt, amount: p.amount })),
    ];

    const usersByMonth = countByMonth(newUsers, monthKeys);
    let runningUsers = usersBeforeWindow;
    const userGrowth = monthKeys.map((key, index) => {
      runningUsers += usersByMonth[index];
      return {
        month: key,
        label: formatMonthLabel(key),
        users: usersByMonth[index],
        cumulativeUsers: runningUsers,
      };
    });

    const ordersTrend = monthKeys.map((key, index) => ({
      month: key,
      label: formatMonthLabel(key),
      orders: countByMonth(paidOrders, monthKeys)[index],
      revenue: sumByMonth(revenueRows, monthKeys)[index],
    }));

    const roleDistribution = roleCounts
      .map((row) => ({
        roleId: row.roleId,
        label: ROLE_CHART_LABELS[row.roleId] ?? `Role ${row.roleId}`,
        count: row._count.id,
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);

    const verificationStatus = verificationCounts.map((row) => ({
      status: row.verificationStatus,
      count: row._count.id,
    }));

    const recentActivity = [
      ...recentUsers.map((u) => ({
        id: `user-${u.id}`,
        type: 'USER_REGISTERED' as const,
        label: `${u.firstName} ${u.lastName} joined as ${u.role.roleName}`,
        date: u.createdAt.toISOString(),
      })),
      ...recentOrders.map((o) => ({
        id: `order-${o.id}`,
        type: 'ORDER' as const,
        label: `${o.listing.title} - ${o.status}`,
        date: o.createdAt.toISOString(),
        amount: o.totalAmount,
      })),
      ...recentConnections.map((c) => ({
        id: `conn-${c.id}`,
        type: 'CONNECTION' as const,
        label: `${c.buyer.firstName} ${c.buyer.lastName} → ${c.farmer.farmerProfile?.farmName ?? `${c.farmer.firstName} ${c.farmer.lastName}`} (${c.status})`,
        date: c.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      generatedAt: new Date().toISOString(),
      userGrowth,
      ordersTrend,
      roleDistribution,
      verificationStatus,
      recentActivity,
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

  async verifyUser(userId: string, status: VerificationStatus, assignedBy?: string) {
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

    if (status === 'VERIFIED' && assignedBy) {
      await prisma.userVerificationTag.upsert({
        where: { userId_tagType: { userId, tagType: 'STANDARD' } },
        create: { userId, tagType: 'STANDARD', assignedBy },
        update: { assignedBy },
      });
    } else if (status === 'PENDING' || status === 'REJECTED') {
      await prisma.userVerificationTag.deleteMany({
        where: { userId, tagType: 'STANDARD' },
      });
    }

    if (status === 'VERIFIED' && existing.verificationStatus !== 'VERIFIED') {
      await notifyUserVerified({
        userId: user.id,
        firstName: user.firstName,
        roleId: user.roleId,
      });
    }

    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: verifiableUserInclude,
    });
  }

  async listUserVerificationTags(userId: string) {
    assertFound(await prisma.user.findUnique({ where: { id: userId } }), 'User not found');
    return prisma.userVerificationTag.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignVerificationTag(
    userId: string,
    tagType: 'STANDARD' | 'INTERNATIONAL_FARMER' | 'INTERNATIONAL_BUYER',
    assignedBy: string
  ) {
    const user = assertFound(
      await prisma.user.findUnique({
        where: { id: userId },
        include: { farmerProfile: { select: { id: true } } },
      }),
      'User not found'
    );

    if (STAFF_ROLES.includes(user.roleId as (typeof STAFF_ROLES)[number])) {
      throw new AppError(403, 'Staff accounts cannot receive verification tags');
    }

    if (!(VERIFIABLE_ROLE_IDS as readonly number[]).includes(user.roleId)) {
      throw new AppError(400, 'Only buyers, farmers, and handlers can receive verification tags');
    }

    const wasVerified = user.verificationStatus === 'VERIFIED';
    const existingTag = await prisma.userVerificationTag.findUnique({
      where: { userId_tagType: { userId, tagType } },
    });

    if (tagType === 'STANDARD' && !wasVerified) {
      await prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: 'VERIFIED' },
      });
      if (user.farmerProfile) {
        await prisma.farmerProfile.update({
          where: { userId },
          data: { verificationStatus: 'VERIFIED' },
        });
      }
    }

    const tag = await prisma.userVerificationTag.upsert({
      where: { userId_tagType: { userId, tagType } },
      create: { userId, tagType, assignedBy },
      update: { assignedBy },
    });

    if (tagType === 'STANDARD' && !wasVerified) {
      await notifyUserVerified({
        userId: user.id,
        firstName: user.firstName,
        roleId: user.roleId,
      });
    } else if (
      !existingTag &&
      (tagType === 'INTERNATIONAL_FARMER' || tagType === 'INTERNATIONAL_BUYER')
    ) {
      await notifyInternationalVerification({
        userId: user.id,
        firstName: user.firstName,
        roleId: user.roleId,
        tagType,
      });
    }

    return tag;
  }

  async removeVerificationTag(
    userId: string,
    tagType: 'STANDARD' | 'INTERNATIONAL_FARMER' | 'INTERNATIONAL_BUYER'
  ) {
    assertFound(await prisma.user.findUnique({ where: { id: userId } }), 'User not found');

    const tag = await prisma.userVerificationTag.findUnique({
      where: { userId_tagType: { userId, tagType } },
    });

    if (tagType === 'STANDARD') {
      if (tag) {
        await prisma.userVerificationTag.delete({
          where: { userId_tagType: { userId, tagType } },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { farmerProfile: { select: { id: true } } },
      });

      if (user?.verificationStatus === 'VERIFIED') {
        await prisma.user.update({
          where: { id: userId },
          data: { verificationStatus: 'PENDING' },
        });
        if (user.farmerProfile) {
          await prisma.farmerProfile.update({
            where: { userId },
            data: { verificationStatus: 'PENDING' },
          });
        }
      }

      return { removed: true };
    }

    assertFound(tag, 'Verification tag not found');

    await prisma.userVerificationTag.delete({
      where: { userId_tagType: { userId, tagType } },
    });

    return { removed: true };
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
