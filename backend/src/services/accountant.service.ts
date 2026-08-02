import { z } from 'zod';
import { WithdrawalStatus } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';
import {
  aniPlatformShareAmount,
  orderShareRecognizedAt,
  publicationPlatformShareAmount,
} from '../utils/distributionFinancials';

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

export const createWithdrawalSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  notes: z.string().max(500).optional(),
});

export const updateWithdrawalSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
  notes: z.string().max(500).optional(),
});

export class AccountantService {
  private async accessTotals() {
    const [farmAccessAgg, completedResearchPurchases, accessPaymentRevenue] = await Promise.all([
      prisma.buyerFarmerAccess.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.researchPurchase.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const farmAccessRevenue = farmAccessAgg._sum.amount ?? 0;
    const researchGrossSales = completedResearchPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const researchRevenue = completedResearchPurchases.reduce(
      (sum, purchase) => sum + publicationPlatformShareAmount(purchase.amount),
      0
    );
    const legacyAccessRevenue = accessPaymentRevenue._sum.amount ?? 0;
    const accessRevenue = farmAccessRevenue + researchRevenue + legacyAccessRevenue;

    return {
      accessRevenue,
      farmAccessRevenue,
      researchRevenue,
      researchGrossSales,
      legacyAccessRevenue,
      farmAccessCount: farmAccessAgg._count.id,
      researchSaleCount: completedResearchPurchases.length,
      legacyAccessCount: accessPaymentRevenue._count.id,
      accessPaymentCount:
        farmAccessAgg._count.id + completedResearchPurchases.length + accessPaymentRevenue._count.id,
    };
  }

  private async orderShareTotals() {
    const releasedOrders = await prisma.productOrder.findMany({
      where: {
        status: 'PAID',
        OR: [{ escrowStatus: 'RELEASED' }, { otpVerifiedAt: { not: null } }],
      },
      select: { totalAmount: true },
    });

    const orderShareRevenue = releasedOrders.reduce(
      (sum, order) => sum + aniPlatformShareAmount(order.totalAmount),
      0
    );

    return {
      orderShareRevenue,
      orderShareCount: releasedOrders.length,
    };
  }

  private async revenueTotals() {
    const [access, orderShare] = await Promise.all([
      this.accessTotals(),
      this.orderShareTotals(),
    ]);

    const totalRevenue = access.accessRevenue + orderShare.orderShareRevenue;
    const transactionCount = access.accessPaymentCount + orderShare.orderShareCount;

    return {
      totalRevenue,
      accessRevenue: access.accessRevenue,
      orderShareRevenue: orderShare.orderShareRevenue,
      orderShareCount: orderShare.orderShareCount,
      farmAccessRevenue: access.farmAccessRevenue,
      researchRevenue: access.researchRevenue,
      researchGrossSales: access.researchGrossSales,
      legacyAccessRevenue: access.legacyAccessRevenue,
      transactionCount,
      farmAccessCount: access.farmAccessCount,
      researchSaleCount: access.researchSaleCount,
      legacyAccessCount: access.legacyAccessCount,
      accessPaymentCount: access.accessPaymentCount,
    };
  }

  /** ANI platform income: access fees + order-share remainder from released orders. */
  async getPlatformIncome() {
    return this.revenueTotals();
  }

  async getOverview() {
    const [revenue, withdrawals, pendingPaidConnections] = await Promise.all([
      this.revenueTotals(),
      prisma.platformWithdrawal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.countPendingPaidConnections(),
    ]);

    const totalWithdrawn = withdrawals._sum.amount ?? 0;

    return {
      generatedAt: new Date().toISOString(),
      ...revenue,
      totalWithdrawn,
      withdrawalCount: withdrawals._count.id,
      availableBalance: Math.max(0, revenue.totalRevenue - totalWithdrawn),
      pendingPaidConnections,
    };
  }

  private async chartWindowData() {
    const monthKeys = chartMonthLabels(CHART_MONTHS);
    const startDate = chartStartDate(CHART_MONTHS);

    const [
      releasedOrders,
      completedFarmAccess,
      completedResearch,
      completedPayments,
      withdrawals,
    ] = await Promise.all([
      prisma.productOrder.findMany({
        where: {
          status: 'PAID',
          OR: [{ escrowStatus: 'RELEASED' }, { otpVerifiedAt: { not: null } }],
        },
        select: {
          totalAmount: true,
          paymentReleasedAt: true,
          otpVerifiedAt: true,
          createdAt: true,
        },
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
      prisma.platformWithdrawal.findMany({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        select: { createdAt: true, amount: true },
      }),
    ]);

    const orderShareRows = releasedOrders
      .map((order) => ({
        createdAt: orderShareRecognizedAt(order),
        amount: aniPlatformShareAmount(order.totalAmount),
      }))
      .filter((row) => row.createdAt >= startDate);

    return {
      monthKeys,
      orderShareRows,
      completedFarmAccess,
      completedResearch,
      completedPayments,
      withdrawals,
    };
  }

  async getIncomeChart() {
    const { monthKeys, orderShareRows, completedFarmAccess, completedResearch, completedPayments } =
      await this.chartWindowData();

    const accessRows = [
      ...completedFarmAccess.map((a) => ({ createdAt: a.createdAt, amount: a.amount })),
      ...completedResearch.map((r) => ({
        createdAt: r.createdAt,
        amount: publicationPlatformShareAmount(r.amount),
      })),
      ...completedPayments.map((p) => ({ createdAt: p.createdAt, amount: p.amount })),
    ];
    const totalRows = [...accessRows, ...orderShareRows];

    const monthlyIncome = monthKeys.map((key, index) => ({
      month: key,
      label: formatMonthLabel(key),
      revenue: sumByMonth(totalRows, monthKeys)[index],
    }));

    return {
      generatedAt: new Date().toISOString(),
      monthlyIncome,
    };
  }

  async getDashboardCharts() {
    const {
      monthKeys,
      orderShareRows,
      completedFarmAccess,
      completedResearch,
      completedPayments,
      withdrawals,
    } = await this.chartWindowData();

    const farmRows = completedFarmAccess.map((a) => ({ createdAt: a.createdAt, amount: a.amount }));
    const researchRows = completedResearch.map((r) => ({
      createdAt: r.createdAt,
      amount: publicationPlatformShareAmount(r.amount),
    }));
    const legacyRows = completedPayments.map((p) => ({ createdAt: p.createdAt, amount: p.amount }));

    const farmByMonth = sumByMonth(farmRows, monthKeys);
    const researchByMonth = sumByMonth(researchRows, monthKeys);
    const legacyByMonth = sumByMonth(legacyRows, monthKeys);
    const accessByMonth = sumByMonth([...farmRows, ...legacyRows], monthKeys);
    const orderShareByMonth = sumByMonth(orderShareRows, monthKeys);
    const revenueByMonth = sumByMonth([...farmRows, ...legacyRows, ...researchRows, ...orderShareRows], monthKeys);
    const withdrawalsByMonth = sumByMonth(withdrawals, monthKeys);
    const volumeByMonth = countByMonth(
      [
        ...farmRows,
        ...legacyRows,
        ...researchRows,
        ...orderShareRows.map((r) => ({ createdAt: r.createdAt })),
      ],
      monthKeys
    );

    const revenue = await this.revenueTotals();

    return {
      generatedAt: new Date().toISOString(),
      monthlyRevenue: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        revenue: revenueByMonth[index],
      })),
      monthlyAccessRevenue: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        revenue: accessByMonth[index],
      })),
      monthlyOrderShareRevenue: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        revenue: orderShareByMonth[index],
      })),
      monthlyResearchPlatformRevenue: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        revenue: researchByMonth[index],
      })),
      revenueBySource: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        access: accessByMonth[index],
        research: researchByMonth[index],
        orderShare: orderShareByMonth[index],
      })),
      accessBreakdownByMonth: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        farmAccess: farmByMonth[index],
        research: researchByMonth[index],
        legacyAccess: legacyByMonth[index],
      })),
      revenueStreamTotals: [
        { key: 'access', label: 'Access income', amount: revenue.farmAccessRevenue + revenue.legacyAccessRevenue },
        { key: 'research', label: 'Publication share (10%)', amount: revenue.researchRevenue },
        { key: 'orderShare', label: 'Order share', amount: revenue.orderShareRevenue },
      ].filter((row) => row.amount > 0),
      accessBreakdownTotals: [
        { key: 'farmAccess', label: 'Farm access', amount: revenue.farmAccessRevenue },
        { key: 'research', label: 'Publication share (10%)', amount: revenue.researchRevenue },
        { key: 'legacyAccess', label: 'Other access', amount: revenue.legacyAccessRevenue },
      ].filter((row) => row.amount > 0),
      transactionVolume: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        count: volumeByMonth[index],
      })),
      cashFlow: monthKeys.map((key, index) => ({
        month: key,
        label: formatMonthLabel(key),
        income: revenueByMonth[index],
        withdrawals: withdrawalsByMonth[index],
      })),
    };
  }

  async countPendingPaidConnections() {
    const pending = await prisma.connectionRequest.findMany({
      where: { status: 'PENDING' },
      select: { buyerId: true, farmerId: true },
    });
    if (pending.length === 0) return 0;

    const accessRows = await prisma.buyerFarmerAccess.findMany({
      where: {
        status: 'COMPLETED',
        OR: pending.map((p) => ({ buyerId: p.buyerId, farmerId: p.farmerId })),
      },
    });
    const paidKeys = new Set(accessRows.map((a) => `${a.buyerId}:${a.farmerId}`));
    return pending.filter((p) => paidKeys.has(`${p.buyerId}:${p.farmerId}`)).length;
  }

  async listWithdrawals() {
    return prisma.platformWithdrawal.findMany({
      include: {
        creator: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWithdrawal(userId: string, data: z.infer<typeof createWithdrawalSchema>) {
    const overview = await this.getOverview();
    if (data.amount > overview.availableBalance) {
      throw new AppError(400, 'Withdrawal amount exceeds available platform balance');
    }

    return prisma.platformWithdrawal.create({
      data: {
        amount: data.amount,
        notes: data.notes ?? null,
        createdBy: userId,
      },
      include: {
        creator: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  async updateWithdrawal(
    withdrawalId: string,
    data: z.infer<typeof updateWithdrawalSchema>
  ) {
    const existing = assertFound(
      await prisma.platformWithdrawal.findUnique({ where: { id: withdrawalId } }),
      'Withdrawal not found'
    );

    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      const overview = await this.getOverview();
      if (existing.amount > overview.availableBalance) {
        throw new AppError(400, 'Cannot complete withdrawal - insufficient available balance');
      }
    }

    return prisma.platformWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: data.status as WithdrawalStatus,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: {
        creator: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }
}

export const accountantService = new AccountantService();
