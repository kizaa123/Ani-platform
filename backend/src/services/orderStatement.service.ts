import fs from 'fs';
import path from 'path';
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

function getLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'ANI Logo.png'),
    path.join(process.cwd(), '..', 'ANI Logo.png'),
    path.join(__dirname, '..', '..', '..', 'ANI Logo.png'),
    path.join(__dirname, '..', '..', 'ANI Logo.png'),
    path.join(__dirname, '..', 'ANI Logo.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

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

export function buildOrderStatementPdf(order: OrderForStatement): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = getLogoPath();
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;
    const farmerName = `${order.farmer.firstName} ${order.farmer.lastName}`;
    const farmName = order.farmer.farmerProfile?.farmName;

    // --- WATERMARK (BACKGROUND) ---
    if (logoPath) {
      doc.save();
      doc.opacity(0.07);
      doc.image(logoPath, (595.28 - 320) / 2, (841.89 - 180) / 2, { width: 320 });
      doc.restore();
    }

    // --- TOP HEADER ---
    if (logoPath) {
      doc.image(logoPath, 45, 38, { width: 55 });
    }

    const titleLeft = logoPath ? 110 : 45;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000').text('Agricess Networking International - ANI', titleLeft, 38);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#166534').text('TOGETHER FOR ALL', titleLeft, 56);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#4B5563').text('OFFICIAL FINANCIAL STATEMENT & ORDER RECEIPT', titleLeft, 68);

    // Top Right Status Badge
    doc.roundedRect(385, 42, 165, 24, 4).fillAndStroke('#DCFCE7', '#86EFAC');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#166534').text('CONFIRMED & RELEASED', 385, 49, { width: 165, align: 'center' });

    // Divider Line
    doc.moveTo(45, 92).lineTo(550, 92).strokeColor('#E5E7EB').lineWidth(1).stroke();

    // --- STATEMENT METADATA BOX ---
    doc.roundedRect(45, 102, 505, 48, 6).fillAndStroke('#F9FAFB', '#E5E7EB');
    
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#6B7280').text('STATEMENT ID', 57, 110);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`ANI-${order.id.slice(0, 8).toUpperCase()}`, 57, 124);

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#6B7280').text('DATE ISSUED', 190, 110);
    doc.font('Helvetica').fontSize(9).fillColor('#111827').text(new Date(order.createdAt).toLocaleDateString(), 190, 124);

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#6B7280').text('PAYMENT METHOD', 300, 110);
    doc.font('Helvetica').fontSize(9).fillColor('#111827').text(order.paymentMethod.replace(/_/g, ' '), 300, 124);

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#6B7280').text('OTP VERIFIED AT', 420, 110);
    doc.font('Helvetica').fontSize(8.5).fillColor('#166534').text(
      order.otpVerifiedAt ? new Date(order.otpVerifiedAt).toLocaleString() : 'CONFIRMED',
      420,
      124
    );

    // --- PARTIES CARDS (BUYER & FARMER) ---
    // Buyer Card
    doc.roundedRect(45, 160, 245, 95, 6).fillAndStroke('#FFFFFF', '#E5E7EB');
    doc.rect(45, 160, 245, 22).fill('#F3F4F6');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#374151').text('BUYER / CUSTOMER (PAYER)', 55, 167);

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(buyerName, 55, 190);
    doc.font('Helvetica').fontSize(8.5).fillColor('#4B5563').text(`Location: ${formatLocation(order.buyer)}`, 55, 206);
    doc.font('Helvetica').fontSize(8.5).fillColor('#4B5563').text(`Email: ${order.buyer.email || '—'}`, 55, 220);
    doc.font('Helvetica').fontSize(8.5).fillColor('#4B5563').text(`Phone: ${order.buyer.phone || '—'}`, 55, 234);

    // Farmer Card
    doc.roundedRect(305, 160, 245, 95, 6).fillAndStroke('#FFFFFF', '#E5E7EB');
    doc.rect(305, 160, 245, 22).fill('#F3F4F6');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#374151').text('FARMER / SUPPLIER (RECIPIENT)', 315, 167);

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(farmerName, 315, 190);
    if (farmName) {
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#166534').text(`Farm: ${farmName}`, 315, 206);
    }
    doc.font('Helvetica').fontSize(8.5).fillColor('#4B5563').text(`Location: ${formatLocation(order.farmer)}`, 315, farmName ? 220 : 206);
    doc.font('Helvetica').fontSize(8.5).fillColor('#4B5563').text(`Phone: ${order.farmer.phone || '—'}`, 315, farmName ? 234 : 220);

    // --- ITEM & BREAKDOWN TABLE ---
    const tableTop = 270;
    doc.roundedRect(45, tableTop, 505, 24, 4).fill('#166534');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
    doc.text('DESCRIPTION / PRODUCT', 55, tableTop + 7);
    doc.text('CATEGORY', 270, tableTop + 7);
    doc.text('QTY', 370, tableTop + 7, { width: 40, align: 'right' });
    doc.text('UNIT PRICE', 420, tableTop + 7, { width: 60, align: 'right' });
    doc.text('TOTAL', 490, tableTop + 7, { width: 50, align: 'right' });

    // Table Row Content
    const rowY = tableTop + 32;
    doc.roundedRect(45, rowY, 505, 42, 4).fillAndStroke('#FFFFFF', '#F3F4F6');

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(order.listing.title, 55, rowY + 8);
    doc.font('Helvetica').fontSize(8).fillColor('#6B7280').text(`Commodity: ${order.listing.commodity.name}`, 55, rowY + 22);

    doc.font('Helvetica').fontSize(9).fillColor('#374151').text(order.listing.commodity.category.name, 270, rowY + 14);
    doc.font('Helvetica').fontSize(9).fillColor('#374151').text(`${order.quantity} ${order.unit}`, 370, rowY + 14, { width: 40, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#374151').text(`GHC ${order.unitPrice.toFixed(2)}`, 420, rowY + 14, { width: 60, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111827').text(`GHC ${order.totalAmount.toFixed(2)}`, 490, rowY + 14, { width: 50, align: 'right' });

    // --- FINANCIAL SUMMARY & TOTAL AMOUNT PAID (HIGHLIGHTED BOLD) ---
    const summaryTop = rowY + 55;
    doc.roundedRect(45, summaryTop, 505, 75, 6).fillAndStroke('#F0FDF4', '#22C55E');

    doc.font('Helvetica').fontSize(9).fillColor('#374151').text('Subtotal:', 60, summaryTop + 12);
    doc.font('Helvetica').fontSize(9).fillColor('#374151').text(`GHC ${order.totalAmount.toFixed(2)}`, 440, summaryTop + 12, { width: 100, align: 'right' });

    doc.font('Helvetica').fontSize(9).fillColor('#374151').text('Escrow & Handling Fee:', 60, summaryTop + 27);
    doc.font('Helvetica').fontSize(9).fillColor('#166534').text('GHC 0.00 (Included)', 440, summaryTop + 27, { width: 100, align: 'right' });

    doc.moveTo(60, summaryTop + 42).lineTo(540, summaryTop + 42).strokeColor('#86EFAC').lineWidth(1).stroke();

    // PROMINENT BOLD TOTAL AMOUNT PAID
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000').text('TOTAL AMOUNT PAID:', 60, summaryTop + 49);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#166534').text(`GHC ${order.totalAmount.toFixed(2)}`, 380, summaryTop + 47, { width: 160, align: 'right' });

    // --- TRUST & FOOTER STAMP ---
    const footerTop = summaryTop + 90;
    doc.roundedRect(45, footerTop, 505, 45, 6).fillAndStroke('#F9FAFB', '#E5E7EB');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534').text('✓ ESCROW PAYMENT CONFIRMED & RELEASED', 55, footerTop + 10);
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(
      `Delivery OTP confirmed on ${order.otpVerifiedAt ? new Date(order.otpVerifiedAt).toLocaleString() : 'N/A'}. Payment released to ANI Accountant.`,
      55,
      footerTop + 24
    );

    // Legal Footer
    doc.font('Helvetica').fontSize(7.5).fillColor('#9CA3AF').text(
      'This financial statement is an official digital record issued by Agricess Networking International (ANI). All funds are protected under ANI Escrow policy until delivery confirmation.',
      45,
      footerTop + 55,
      { align: 'center', width: 505 }
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

  // Require OTP verification before allowing PDF download
  if (!order.otpVerifiedAt || order.escrowStatus !== 'RELEASED') {
    throw new AppError(
      400,
      'Financial statement (PDF) is locked until the buyer confirms the delivery release OTP.'
    );
  }

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
