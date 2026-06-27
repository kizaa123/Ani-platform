import prisma from '../database/prisma';
import { assertAuthorized, assertFound } from '../utils/errors';
import { ROLES } from '../constants/roles';
import { buyerOrderInclude, groupBuyerPlacedOrders, type BuyerPlacedOrderRow } from '../utils/orders';

export class BuyerService {
  private assertBuyer(roleId: number) {
    assertAuthorized(roleId === ROLES.BUYER, 'This feature is only available to buyers');
  }

  async fetchOrdersForBuyer(buyerId: string) {
    const orders = await prisma.productOrder.findMany({
      where: { buyerId },
      include: buyerOrderInclude,
      orderBy: { createdAt: 'desc' },
    });

    return groupBuyerPlacedOrders(orders as BuyerPlacedOrderRow[]);
  }

  async buildFinancialStatementForBuyer(buyerId: string) {
    const buyer = assertFound(
      await prisma.user.findUnique({
        where: { id: buyerId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          country: true,
          region: true,
          buyerProfile: { select: { company: true } },
        },
      }),
      'Buyer profile not found'
    );

    const [orderStats, farmAccess] = await Promise.all([
      prisma.productOrder.findMany({
        where: { buyerId },
        select: { status: true, totalAmount: true },
      }),
      prisma.buyerFarmerAccess.findMany({
        where: { buyerId },
        include: {
          farmer: {
            select: {
              firstName: true,
              lastName: true,
              region: true,
              country: true,
              farmerProfile: { select: { farmName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const farmAccessPayments = farmAccess.map((access) => ({
      id: access.id,
      date: access.createdAt.toISOString(),
      farmerName: `${access.farmer.firstName} ${access.farmer.lastName}`,
      farmName: access.farmer.farmerProfile?.farmName ?? null,
      farmerRegion: access.farmer.region,
      farmerCountry: access.farmer.country,
      amount: access.amount,
      paymentMethod: access.paymentMethod,
      transactionId: access.transactionId,
      status: access.status,
    }));

    const paidOrders = orderStats.filter((o) => o.status === 'PAID');
    const totalProductSpend = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedAccess = farmAccess.filter((a) => a.status === 'COMPLETED');
    const totalFarmAccessSpend = completedAccess.reduce((sum, a) => sum + a.amount, 0);

    return {
      buyerName: `${buyer.firstName} ${buyer.lastName}`,
      email: buyer.email,
      country: buyer.country,
      region: buyer.region,
      company: buyer.buyerProfile?.company ?? null,
      generatedAt: new Date().toISOString(),
      summary: {
        totalOrders: orderStats.length,
        paidOrders: paidOrders.length,
        totalProductSpend,
        totalFarmAccessSpend,
        totalSpent: totalProductSpend + totalFarmAccessSpend,
        farmsAccessed: completedAccess.length,
      },
      farmAccessPayments,
    };
  }

  async getOrders(userId: string, roleId: number) {
    this.assertBuyer(roleId);
    return this.fetchOrdersForBuyer(userId);
  }

  async getFinancialStatement(userId: string, roleId: number) {
    this.assertBuyer(roleId);
    return this.buildFinancialStatementForBuyer(userId);
  }
}

export const buyerService = new BuyerService();
