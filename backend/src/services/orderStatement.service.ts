import PDFDocument from 'pdfkit';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import { verifyReleaseOtp } from '../utils/orderOtp';
import {
  ROLES,
  isFarmerHandler,
  isBuyerHandler,
  isStaffRole,
} from '../constants/roles';
import { notifyOrderPaymentReleased } from './notification.service';

type OrderForStatement = NonNullable<Awaited<ReturnType<typeof loadOrderForStatement>>>;

async function loadOrderForStatement(orderId: string) {
  return prisma.productOrder.findUnique({
    where: { id: orderId },
    include: {
      listing: { include: { commodity: { include: { category: true } } } },
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          country: true,
          region: true,
          city: true,
        },
      },
      farmer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          country: true,
          region: true,
          city: true,
          farmerProfile: { select: { farmName: true } },
        },
      },
    },
  });
}

export async function canAccessOrderStatement(
  userId: string,
  roleId: number,
  order: { buyerId: string; farmerId: string }
): Promise<boolean> {
  if (order.buyerId === userId || order.farmerId === userId) return true;
  if (isStaffRole(roleId)) return true;

  if (isFarmerHandler(roleId)) {
    const assignment = await prisma.agentAssignment.findFirst({
      where: {
        agentId: userId,
        ownerId: order.farmerId,
        relationshipType: 'FARMER_REPRESENTATIVE',
      },
    });
    if (assignment) return true;
  }

  if (isBuyerHandler(roleId)) {
    const assignment = await prisma.agentAssignment.findFirst({
      where: {
        agentId: userId,
        ownerId: order.buyerId,
        relationshipType: 'BUYER_REPRESENTATIVE',
      },
    });
    if (assignment) return true;
  }

  return false;
}

export async function assertOrderStatementAccess(
  userId: string,
  roleId: number,
  orderId: string
): Promise<OrderForStatement> {
  const order = assertFound(await loadOrderForStatement(orderId), 'Order not found');
  const allowed = await canAccessOrderStatement(userId, roleId, order);
  assertAuthorized(allowed, 'You do not have access to this order statement');
  return order;
}

function formatLocation(user: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  return [user.city, user.region, user.country].filter(Boolean).join(', ') || '—';
}

function escrowLabel(status: string): string {
  return status === 'RELEASED'
    ? 'Released to ANI Accountant'
    : 'Held until delivery confirmed';
}

export function buildOrderStatementPdf(order: OrderForStatement): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;
    const farmerName = `${order.farmer.firstName} ${order.farmer.lastName}`;
    const farmName = order.farmer.farmerProfile?.farmName;

    doc.fontSize(20).fillColor('#166534').text('ANI Platform', { align: 'center' });
    doc.fontSize(14).fillColor('#374151').text('Financial Statement / Order Receipt', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(10).fillColor('#6B7280').text(`Order ID: ${order.id}`);
    doc.text(`Date: ${order.createdAt.toLocaleString()}`);
    doc.text(`Transaction: ${order.transactionId ?? '—'}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#111827').text('Order Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Product: ${order.listing.title}`);
    doc.text(`Commodity: ${order.listing.commodity.name} (${order.listing.commodity.category.name})`);
    doc.text(`Quantity: ${order.quantity} ${order.unit}`);
    doc.text(`Unit price: GHC ${order.unitPrice.toFixed(2)}`);
    doc.text(`Total amount: GHC ${order.totalAmount.toFixed(2)}`);
    doc.text(`Payment method: ${order.paymentMethod.replace(/_/g, ' ')}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#111827').text('From (Buyer)', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Name: ${buyerName}`);
    doc.text(`Location: ${formatLocation(order.buyer)}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#111827').text('To (Farmer)', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Name: ${farmerName}${farmName ? ` (${farmName})` : ''}`);
    doc.text(`Location: ${formatLocation(order.farmer)}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#111827').text('Payment & Escrow', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Order status: ${order.status}`);
    doc.text(`Escrow status: ${escrowLabel(order.escrowStatus)}`);
    if (order.otpVerifiedAt) {
      doc.text(`Delivery confirmed: ${order.otpVerifiedAt.toLocaleString()}`);
    }
    if (order.paymentReleasedAt) {
      doc.text(`Funds released: ${order.paymentReleasedAt.toLocaleString()}`);
    }
    doc.moveDown();

    if (order.releaseOtp && order.escrowStatus === 'HELD') {
      doc.fontSize(12).fillColor('#166534').text('Delivery Release Code', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(22).fillColor('#166534').text(order.releaseOtp, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#6B7280').text(
        'Buyer: enter this 4-digit code in My Orders after you receive your delivery to release payment to the ANI Accountant.',
        { align: 'center' }
      );
      doc.moveDown();
    }

    doc.fontSize(8).fillColor('#9CA3AF').text(
      'This document is an official ANI Platform financial record. Funds are held in escrow until the buyer confirms delivery.',
      { align: 'center' }
    );

    doc.end();
  });
}

export async function generateOrderStatementPdf(
  orderId: string,
  userId: string,
  roleId: number
): Promise<{ buffer: Buffer; filename: string }> {
  const order = await assertOrderStatementAccess(userId, roleId, orderId);
  const buffer = await buildOrderStatementPdf(order);
  const filename = `ani-order-${orderId.slice(0, 8)}.pdf`;
  return { buffer, filename };
}

export async function getOrderDetail(orderId: string, userId: string, roleId: number) {
  const order = await assertOrderStatementAccess(userId, roleId, orderId);
  const canRelease =
    roleId === ROLES.BUYER &&
    order.buyerId === userId &&
    order.status === 'PAID' &&
    order.escrowStatus === 'HELD';

  return {
    id: order.id,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    listingId: order.listingId,
    quantity: order.quantity,
    unit: order.unit,
    unitPrice: order.unitPrice,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    transactionId: order.transactionId,
    trackStage: order.trackStage,
    trackUpdatedAt: order.trackUpdatedAt?.toISOString() ?? null,
    escrowStatus: order.escrowStatus,
    otpVerifiedAt: order.otpVerifiedAt?.toISOString() ?? null,
    paymentReleasedAt: order.paymentReleasedAt?.toISOString() ?? null,
    canRelease,
    releaseOtp: canRelease ? order.releaseOtp : null,
    createdAt: order.createdAt.toISOString(),
    productName: order.listing.title,
    buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`,
    farmerName: `${order.farmer.firstName} ${order.farmer.lastName}`,
  };
}

export async function releaseOrderPayment(
  orderId: string,
  buyerId: string,
  roleId: number,
  otp: string
) {
  assertAuthorized(roleId === ROLES.BUYER, 'Only buyers can release order payments');

  const order = assertFound(
    await prisma.productOrder.findUnique({ where: { id: orderId } }),
    'Order not found'
  );

  if (order.buyerId !== buyerId) {
    throw new AppError(403, 'This order does not belong to you');
  }
  if (order.status !== 'PAID') {
    throw new AppError(400, 'Order payment is not complete');
  }
  if (order.escrowStatus === 'RELEASED') {
    throw new AppError(400, 'Payment has already been released');
  }

  if (!verifyReleaseOtp(otp, order.releaseOtp)) {
    throw new AppError(400, 'Invalid release code. Check your order statement.');
  }

  const now = new Date();
  const updated = await prisma.productOrder.update({
    where: { id: orderId },
    data: {
      escrowStatus: 'RELEASED',
      otpVerifiedAt: now,
      paymentReleasedAt: now,
      releaseOtp: null,
    },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { firstName: true, lastName: true } },
      farmer: { select: { firstName: true, lastName: true } },
    },
  });

  await notifyOrderPaymentReleased(updated);

  return {
    id: updated.id,
    escrowStatus: updated.escrowStatus,
    otpVerifiedAt: updated.otpVerifiedAt?.toISOString() ?? null,
    paymentReleasedAt: updated.paymentReleasedAt?.toISOString() ?? null,
    canRelease: false,
    releaseOtp: null,
  };
}
