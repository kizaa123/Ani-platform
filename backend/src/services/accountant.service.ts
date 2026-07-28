import { z } from 'zod';
import { WithdrawalStatus } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';

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
  private async revenueTotals() {
    const [productRevenue, farmAccessAgg, researchAgg, accessPaymentRevenue] =
      await Promise.all([
        prisma.productOrder.aggregate({
          where: { status: 'PAID' },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        prisma.buyerFarmerAccess.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.researchPurchase.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.payment.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

    const productOrderRevenue = productRevenue._sum.totalAmount ?? 0;
    const farmAccessRevenue = farmAccessAgg._sum.amount ?? 0;
    const researchRevenue = researchAgg._sum.amount ?? 0;
    const legacyAccessRevenue = accessPaymentRevenue._sum.amount ?? 0;

    const totalRevenue =
      productOrderRevenue + farmAccessRevenue + researchRevenue + legacyAccessRevenue;

    const transactionCount =
      productRevenue._count.id +
      farmAccessAgg._count.id +
      researchAgg._count.id +
      accessPaymentRevenue._count.id;

    return {
      totalRevenue,
      productOrderRevenue,
      farmAccessRevenue,
      researchRevenue,
      transactionCount,
      productOrderCount: productRevenue._count.id,
      farmAccessCount: farmAccessAgg._count.id,
      researchSaleCount: researchAgg._count.id,
    };
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

  async getIncomeChart() {
    const monthKeys = chartMonthLabels(CHART_MONTHS);
    const startDate = chartStartDate(CHART_MONTHS);

    const [paidOrders, completedFarmAccess, completedResearch, completedPayments] =
      await Promise.all([
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
      ]);

    const revenueRows = [
      ...paidOrders.map((o) => ({ createdAt: o.createdAt, amount: o.totalAmount })),
      ...completedFarmAccess.map((a) => ({ createdAt: a.createdAt, amount: a.amount })),
      ...completedResearch.map((r) => ({ createdAt: r.createdAt, amount: r.amount })),
      ...completedPayments.map((p) => ({ createdAt: p.createdAt, amount: p.amount })),
    ];

    const monthlyIncome = monthKeys.map((key, index) => ({
      month: key,
      label: formatMonthLabel(key),
      revenue: sumByMonth(revenueRows, monthKeys)[index],
    }));

    return {
      generatedAt: new Date().toISOString(),
      monthlyIncome,
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
        throw new AppError(400, 'Cannot complete withdrawal — insufficient available balance');
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
