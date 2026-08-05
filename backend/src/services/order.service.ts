import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import { ROLES, canPurchaseFromMarketplace } from '../constants/roles';
import { buyerHasApprovedFarmAccess } from '../middleware/access.middleware';
import { isListingOrderable } from './farmAccess.service';
import { getPaymentProvider } from './payment.provider';
import { notifyNewOrder, notifyProductPurchase } from './notification.service';
import { generateReleaseOtp } from '../utils/orderOtp';
import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';

export const purchaseProductSchema = z.object({
  quantity: z.number().positive(),
  paymentMethod: z.string().min(2),
});

export const releaseOrderSchema = z.object({
  otp: z.string().regex(/^\d{4}$/, 'Release code must be 4 digits'),
});

export class OrderService {
  async purchaseProduct(buyerId: string, roleId: number, listingId: string, data: z.infer<typeof purchaseProductSchema>) {
    assertAuthorized(canPurchaseFromMarketplace(roleId), 'Only marketplace purchasers can buy products');

    const listing = assertFound(
      await prisma.commodityListing.findUnique({
        where: { id: listingId },
        include: {
          commodity: { include: { category: true } },
          farmer: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, country: true },
              },
            },
          },
          media: { where: { type: 'IMAGE' }, orderBy: { orderIndex: 'asc' }, take: 1 },
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

    if (!isListingOrderable(listing)) {
      throw new AppError(
        400,
        'This product is no longer available — the harvest period has ended'
      );
    }

    const farmerUserId = listing.farmer.userId;

    if (farmerUserId === buyerId) {
      throw new AppError(400, 'You cannot purchase from your own farm');
    }

    if (!(await buyerHasApprovedFarmAccess(buyerId, farmerUserId))) {
      throw new AppError(
        403,
        'Farm access required — pay the access fee to unlock this farm and place orders',
        'FARM_ACCESS_REQUIRED'
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
      const releaseOtp = generateReleaseOtp();

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
          releaseOtp: result.status === 'COMPLETED' ? releaseOtp : null,
          escrowStatus: 'HELD',
        },
        include: {
          listing: { include: { commodity: true } },
          buyer: { select: { firstName: true, lastName: true, email: true, country: true } },
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
        releaseOtp: result.status === 'COMPLETED' ? releaseOtp : null,
        orderId: order.id,
      };
    });

    const buyerName = `${txResult.order.buyer.firstName} ${txResult.order.buyer.lastName}`;
    const farmerName = `${listing.farmer.user.firstName} ${listing.farmer.user.lastName}`;
    const normalized = normalizeImages(listing.images);
    const imageFromMedia = listing.media[0]?.url;
    const imageUrl = imageFromMedia
      ? normalizePublicAssetUrl(imageFromMedia)
      : normalized[0]
        ? normalizePublicAssetUrl(normalized[0])
        : null;
    const buyerCountry = txResult.order.buyer.country ?? 'Ghana';
    const farmerCountry = listing.farmer.user.country ?? 'Ghana';
    await notifyNewOrder(farmerUserId, buyerId, buyerName, listing.title, totalAmount, {
      quantity: data.quantity,
      unit: listing.unit,
      imageUrl,
      listingId: listing.id,
      buyerCountry,
      farmerCountry,
      orderId: txResult.order.id,
    });
    await notifyProductPurchase(
      buyerId,
      farmerUserId,
      farmerName,
      listing.title,
      totalAmount,
      txResult.order.id,
      buyerCountry
    );

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
