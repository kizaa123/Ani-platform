import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import { ROLES } from '../constants/roles';
import { buyerHasApprovedFarmAccess } from '../middleware/access.middleware';
import { getPaymentProvider } from './payment.provider';
import { notifyNewOrder, notifyProductPurchase } from './notification.service';

export const purchaseProductSchema = z.object({
  quantity: z.number().positive(),
  paymentMethod: z.string().min(2),
});

export class OrderService {
  async purchaseProduct(buyerId: string, roleId: number, listingId: string, data: z.infer<typeof purchaseProductSchema>) {
    assertAuthorized(roleId === ROLES.BUYER, 'Only buyers can purchase products');

    const listing = assertFound(
      await prisma.commodityListing.findUnique({
        where: { id: listingId },
        include: {
          commodity: { include: { category: true } },
          farmer: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
      }),
      'Product not found'
    );

    if (listing.status !== 'ACTIVE') {
      throw new AppError(400, 'This product is no longer available');
    }

    if (listing.quantity <= 0) {
      throw new AppError(400, 'This product is sold out');
    }

    const farmerUserId = listing.farmer.userId;

    if (!(await buyerHasApprovedFarmAccess(buyerId, farmerUserId))) {
      throw new AppError(
        403,
        'Farm access required — pay the access fee and wait for the farmer to approve your connection'
      );
    }

    if (data.quantity > listing.quantity) {
      throw new AppError(400, `Only ${listing.quantity} ${listing.unit} available`);
    }

    const totalAmount = Math.round(data.quantity * listing.price * 100) / 100;

    const provider = getPaymentProvider();
    const result = await provider.initiatePayment({
      userId: buyerId,
      amount: totalAmount,
      paymentMethod: data.paymentMethod,
      referenceId: listingId,
      type: 'PRODUCT_ORDER',
    });

    if (result.status === 'FAILED') {
      throw new AppError(402, 'Payment failed');
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const order = await tx.productOrder.create({
        data: {
          buyerId,
          farmerId: farmerUserId,
          listingId,
          quantity: data.quantity,
          unitPrice: listing.price,
          totalAmount,
          unit: listing.unit,
          paymentMethod: data.paymentMethod,
          transactionId: result.transactionId,
          status: result.status === 'COMPLETED' ? 'PAID' : 'PENDING',
          trackStage: 'ORDER_RECEIVED',
          trackUpdatedAt: result.status === 'COMPLETED' ? new Date() : null,
        },
        include: {
          listing: { include: { commodity: true } },
          buyer: { select: { firstName: true, lastName: true, email: true } },
        },
      });

      const remaining = listing.quantity - data.quantity;
      await tx.commodityListing.update({
        where: { id: listingId },
        data: {
          quantity: remaining,
          status: remaining <= 0 ? 'SOLD' : 'ACTIVE',
        },
      });

      return {
        order,
        message: `Purchased ${data.quantity} ${listing.unit} of ${listing.title}`,
        totalPaid: totalAmount,
      };
    });

    const buyerName = `${txResult.order.buyer.firstName} ${txResult.order.buyer.lastName}`;
    const farmerName = `${listing.farmer.user.firstName} ${listing.farmer.user.lastName}`;
    await notifyNewOrder(farmerUserId, buyerId, buyerName, listing.title, totalAmount);
    await notifyProductPurchase(buyerId, farmerUserId, farmerName, listing.title, totalAmount);

    return txResult;
  }

  async buyerOrders(buyerId: string) {
    return prisma.productOrder.findMany({
      where: { buyerId },
      include: {
        listing: { include: { commodity: { include: { category: true } } } },
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            region: true,
            country: true,
            farmerProfile: { select: { farmName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const orderService = new OrderService();
