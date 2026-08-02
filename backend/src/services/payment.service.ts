import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import { ROLES, isFarmerRole, isMarketplaceBuyerRole, canPurchaseFromMarketplace } from '../constants/roles';
import { getPaymentProvider } from './payment.provider';
import { notifyFarmAccessPaid } from './notification.service';
import { FARM_ACCESS_PRICE_GHC } from '../constants/pricing';

export const purchaseSchema = z.object({
  packageId: z.string().uuid(),
  paymentMethod: z.string().min(2),
});

export const packageSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
  durationDays: z.number().int().positive(),
});

export const purchaseFarmAccessSchema = z.object({
  farmerId: z.string().uuid(),
  paymentMethod: z.string().min(2),
});

export class PaymentService {
  async getPackages() {
    return prisma.accessPackage.findMany({ orderBy: { price: 'asc' } });
  }

  async getAccessStatus(buyerId: string) {
    const access = await prisma.buyerAccess.findFirst({
      where: { buyerId, status: 'ACTIVE', endDate: { gte: new Date() } },
      include: { package: true },
      orderBy: { endDate: 'desc' },
    });
    return { hasAccess: !!access, access };
  }

  async purchase(buyerId: string, roleId: number, data: z.infer<typeof purchaseSchema>) {
    assertAuthorized(isMarketplaceBuyerRole(roleId), 'Only buyers and researchers can purchase access packages');

    const pkg = assertFound(
      await prisma.accessPackage.findUnique({ where: { id: data.packageId } }),
      'Access package not found'
    );

    const provider = getPaymentProvider();
    const result = await provider.initiatePayment({
      userId: buyerId,
      amount: pkg.price,
      packageId: pkg.id,
      paymentMethod: data.paymentMethod,
      type: 'ACCESS_PACKAGE',
    });

    if (result.status === 'FAILED') {
      throw new AppError(402, 'Payment failed');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + pkg.durationDays);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: buyerId,
          amount: pkg.price,
          paymentMethod: data.paymentMethod,
          transactionId: result.transactionId,
          status: result.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          packageId: pkg.id,
        },
      });

      const access = await tx.buyerAccess.create({
        data: {
          buyerId,
          packageId: pkg.id,
          startDate,
          endDate,
          status: 'ACTIVE',
        },
        include: { package: true },
      });

      return { payment, access, message: `Access activated for ${pkg.durationDays} days` };
    });
  }

  async paymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async allPayments() {
    return prisma.payment.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        package: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPackage(data: z.infer<typeof packageSchema>) {
    return prisma.accessPackage.create({ data });
  }

  async purchaseFarmAccess(buyerId: string, roleId: number, data: z.infer<typeof purchaseFarmAccessSchema>) {
    assertAuthorized(canPurchaseFromMarketplace(roleId), 'Only marketplace purchasers can purchase farm access');

    if (data.farmerId === buyerId) {
      throw new AppError(400, 'You cannot purchase access to your own farm');
    }

    const farmer = assertFound(
      await prisma.user.findUnique({
        where: { id: data.farmerId },
        include: { farmerProfile: true },
      }),
      'Farmer not found'
    );
    assertAuthorized(isFarmerRole(farmer.roleId), 'Target user is not a farmer');
    assertAuthorized(!!farmer.farmerProfile, 'Farmer profile not found');

    const existing = await prisma.buyerFarmerAccess.findUnique({
      where: { buyerId_farmerId: { buyerId, farmerId: data.farmerId } },
    });
    if (existing?.status === 'COMPLETED') {
      throw new AppError(409, 'You already have access to this farm');
    }

    const farmAccessPrice = FARM_ACCESS_PRICE_GHC;

    const provider = getPaymentProvider();
    const result = await provider.initiatePayment({
      userId: buyerId,
      amount: farmAccessPrice,
      paymentMethod: data.paymentMethod,
      referenceId: data.farmerId,
      type: 'PRODUCT_ORDER',
    });

    if (result.status === 'FAILED') {
      throw new AppError(402, 'Payment failed');
    }

    const paymentCompleted = result.status === 'COMPLETED';
    const connectionStatus = paymentCompleted ? 'ACCEPTED' : 'PENDING';

    const txResult = await prisma.$transaction(async (tx) => {
      const farmAccess = await tx.buyerFarmerAccess.upsert({
        where: { buyerId_farmerId: { buyerId, farmerId: data.farmerId } },
        create: {
          buyerId,
          farmerId: data.farmerId,
          amount: farmAccessPrice,
          paymentMethod: data.paymentMethod,
          transactionId: result.transactionId,
          status: paymentCompleted ? 'COMPLETED' : 'PENDING',
        },
        update: {
          amount: farmAccessPrice,
          paymentMethod: data.paymentMethod,
          transactionId: result.transactionId,
          status: paymentCompleted ? 'COMPLETED' : 'PENDING',
        },
      });

      await tx.connectionRequest.upsert({
        where: { buyerId_farmerId: { buyerId, farmerId: data.farmerId } },
        create: { buyerId, farmerId: data.farmerId, status: connectionStatus },
        update: { status: connectionStatus },
      });

      return {
        farmAccess,
        message: paymentCompleted
          ? `Access granted - you can now view ${farmer.firstName}'s farm and products`
          : `Payment received - farm access will activate once payment is confirmed`,
        amountPaid: farmAccessPrice,
        farmerName: `${farmer.firstName} ${farmer.lastName}`,
        pendingApproval: !paymentCompleted,
        accessGranted: paymentCompleted,
      };
    });

    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { firstName: true, lastName: true },
    });
    const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : 'A buyer';
    await notifyFarmAccessPaid(
      buyerId,
      data.farmerId,
      buyerName,
      `${farmer.firstName} ${farmer.lastName}`,
      farmAccessPrice,
      paymentCompleted
    );

    return txResult;
  }
}

export const paymentService = new PaymentService();
