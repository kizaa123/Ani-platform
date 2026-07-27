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
    path.join(__dirname, '..', '..', 'public', 'ani-logo.png'),
    path.join(process.cwd(), 'public', 'ani-logo.png'),
    path.join(process.cwd(), 'ANI Logo.png'),
    path.join(process.cwd(), '..', 'ANI Logo.png'),
    path.join(process.cwd(), '..', 'frontend', 'public', 'login_cover.png'),
    path.join(__dirname, '..', '..', '..', 'ANI Logo.png'),
    path.join(__dirname, '..', '..', 'ANI Logo.png'),
    path.join(__dirname, '..', 'ANI Logo.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const PAGE_MARGIN = 45;
const CONTENT_WIDTH = 505;
const CONTENT_RIGHT = PAGE_MARGIN + CONTENT_WIDTH;

function drawPageWatermark(doc: PDFKit.PDFDocument, logoPath: string): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const watermarkWidth = 260;

  doc.save();
  doc.opacity(0.08);
  doc.image(logoPath, (pageWidth - watermarkWidth) / 2, (pageHeight - watermarkWidth * 0.45) / 2, {
    width: watermarkWidth,
  });
  doc.restore();
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

function formatStatementDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatStatementDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildOrderStatementPdf(order: OrderForStatement): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = getLogoPath();
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;
    const farmerName = `${order.farmer.firstName} ${order.farmer.lastName}`;
    const farmName = order.farmer.farmerProfile?.farmName;
    const totalFormatted = `GHC ${order.totalAmount.toFixed(2)}`;
    const otpVerifiedLabel = order.otpVerifiedAt
      ? formatStatementDateTime(order.otpVerifiedAt)
      : 'Confirmed';

    if (logoPath) {
      drawPageWatermark(doc, logoPath);
      doc.on('pageAdded', () => drawPageWatermark(doc, logoPath));
    }

    // --- HEADER ---
    const headerTop = 38;
    if (logoPath) {
      doc.image(logoPath, PAGE_MARGIN, headerTop, { width: 50 });
    }

    const titleLeft = logoPath ? 105 : PAGE_MARGIN;
    const titleWidth = 270;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827');
    doc.text('Agricess Networking International', titleLeft, headerTop, { width: titleWidth });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#166534');
    doc.text('TOGETHER FOR ALL', titleLeft, headerTop + 18);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#4B5563');
    doc.text('Official Financial Statement & Order Receipt', titleLeft, headerTop + 32);

    const badgeWidth = 150;
    const badgeLeft = CONTENT_RIGHT - badgeWidth;
    doc.roundedRect(badgeLeft, headerTop + 4, badgeWidth, 22, 4).fillAndStroke('#DCFCE7', '#86EFAC');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#166534');
    doc.text('CONFIRMED & RELEASED', badgeLeft, headerTop + 11, { width: badgeWidth, align: 'center' });

    const headerBottom = headerTop + 58;
    doc.moveTo(PAGE_MARGIN, headerBottom).lineTo(CONTENT_RIGHT, headerBottom).strokeColor('#E5E7EB').lineWidth(1).stroke();

    // --- STATEMENT METADATA (2x2 grid to avoid column overlap) ---
    const metaTop = headerBottom + 10;
    const metaHeight = 58;
    doc.roundedRect(PAGE_MARGIN, metaTop, CONTENT_WIDTH, metaHeight, 6).fillAndStroke('#F9FAFB', '#E5E7EB');

    const metaCol1 = PAGE_MARGIN + 12;
    const metaCol2 = PAGE_MARGIN + 260;
    const metaRow1 = metaTop + 10;
    const metaRow2 = metaTop + 34;

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#6B7280').text('STATEMENT ID', metaCol1, metaRow1);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111827').text(`ANI-${order.id.slice(0, 8).toUpperCase()}`, metaCol1, metaRow1 + 11);

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#6B7280').text('DATE ISSUED', metaCol2, metaRow1);
    doc.font('Helvetica').fontSize(9).fillColor('#111827').text(formatStatementDate(order.createdAt), metaCol2, metaRow1 + 11);

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#6B7280').text('PAYMENT METHOD', metaCol1, metaRow2);
    doc.font('Helvetica').fontSize(9).fillColor('#111827').text(order.paymentMethod.replace(/_/g, ' '), metaCol1, metaRow2 + 11, { width: 230 });

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#6B7280').text('OTP VERIFIED', metaCol2, metaRow2);
    doc.font('Helvetica').fontSize(8.5).fillColor('#166534').text(otpVerifiedLabel, metaCol2, metaRow2 + 11, { width: 230 });

    // --- PARTIES ---
    const partyTop = metaTop + metaHeight + 12;
    const partyWidth = 245;
    const partyHeight = 92;
    const partyGap = 15;
    const farmerLeft = PAGE_MARGIN + partyWidth + partyGap;

    doc.roundedRect(PAGE_MARGIN, partyTop, partyWidth, partyHeight, 6).fillAndStroke('#FFFFFF', '#E5E7EB');
    doc.rect(PAGE_MARGIN, partyTop, partyWidth, 20).fill('#F3F4F6');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#374151').text('BUYER / CUSTOMER (PAYER)', PAGE_MARGIN + 10, partyTop + 6);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111827').text(buyerName, PAGE_MARGIN + 10, partyTop + 28, { width: partyWidth - 20 });
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(`Location: ${formatLocation(order.buyer)}`, PAGE_MARGIN + 10, partyTop + 44, { width: partyWidth - 20 });
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(`Email: ${order.buyer.email || '—'}`, PAGE_MARGIN + 10, partyTop + 58, { width: partyWidth - 20 });
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(`Phone: ${order.buyer.phone || '—'}`, PAGE_MARGIN + 10, partyTop + 72, { width: partyWidth - 20 });

    doc.roundedRect(farmerLeft, partyTop, partyWidth, partyHeight, 6).fillAndStroke('#FFFFFF', '#E5E7EB');
    doc.rect(farmerLeft, partyTop, partyWidth, 20).fill('#F3F4F6');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#374151').text('FARMER / SUPPLIER (RECIPIENT)', farmerLeft + 10, partyTop + 6);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111827').text(farmerName, farmerLeft + 10, partyTop + 28, { width: partyWidth - 20 });
    let farmerDetailY = partyTop + 44;
    if (farmName) {
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#166534').text(`Farm: ${farmName}`, farmerLeft + 10, farmerDetailY, { width: partyWidth - 20 });
      farmerDetailY += 14;
    }
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(`Location: ${formatLocation(order.farmer)}`, farmerLeft + 10, farmerDetailY, { width: partyWidth - 20 });
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(`Phone: ${order.farmer.phone || '—'}`, farmerLeft + 10, farmerDetailY + 14, { width: partyWidth - 20 });

    // --- LINE ITEMS TABLE ---
    const tableTop = partyTop + partyHeight + 16;
    doc.roundedRect(PAGE_MARGIN, tableTop, CONTENT_WIDTH, 22, 4).fill('#166534');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
    doc.text('DESCRIPTION / PRODUCT', PAGE_MARGIN + 10, tableTop + 6);
    doc.text('CATEGORY', 268, tableTop + 6);
    doc.text('QTY', 368, tableTop + 6, { width: 40, align: 'right' });
    doc.text('UNIT PRICE', 418, tableTop + 6, { width: 60, align: 'right' });
    doc.text('LINE TOTAL', 488, tableTop + 6, { width: 52, align: 'right' });

    const rowY = tableTop + 28;
    const rowHeight = 40;
    doc.roundedRect(PAGE_MARGIN, rowY, CONTENT_WIDTH, rowHeight, 4).fillAndStroke('#FFFFFF', '#E5E7EB');
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111827').text(order.listing.title, PAGE_MARGIN + 10, rowY + 8, { width: 195 });
    doc.font('Helvetica').fontSize(7.5).fillColor('#6B7280').text(`Commodity: ${order.listing.commodity.name}`, PAGE_MARGIN + 10, rowY + 22, { width: 195 });
    doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(order.listing.commodity.category.name, 268, rowY + 14, { width: 90 });
    doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(`${order.quantity} ${order.unit}`, 368, rowY + 14, { width: 40, align: 'right' });
    doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(`GHC ${order.unitPrice.toFixed(2)}`, 418, rowY + 14, { width: 60, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827').text(totalFormatted, 488, rowY + 14, { width: 52, align: 'right' });

    // --- FINANCIAL BREAKDOWN ---
    const breakdownTop = rowY + rowHeight + 14;
    const breakdownHeight = 52;
    doc.roundedRect(PAGE_MARGIN, breakdownTop, CONTENT_WIDTH, breakdownHeight, 6).fillAndStroke('#FAFAFA', '#E5E7EB');

    doc.font('Helvetica').fontSize(9).fillColor('#374151').text('Subtotal', PAGE_MARGIN + 15, breakdownTop + 12);
    doc.font('Helvetica').fontSize(9).fillColor('#374151').text(totalFormatted, 400, breakdownTop + 12, { width: 95, align: 'right' });

    doc.font('Helvetica').fontSize(9).fillColor('#374151').text('Escrow & Handling Fee', PAGE_MARGIN + 15, breakdownTop + 28);
    doc.font('Helvetica').fontSize(9).fillColor('#166534').text('GHC 0.00 (Included)', 400, breakdownTop + 28, { width: 95, align: 'right' });

    // --- PROMINENT TOTAL AMOUNT ---
    const totalTop = breakdownTop + breakdownHeight + 10;
    const totalHeight = 54;
    doc.roundedRect(PAGE_MARGIN, totalTop, CONTENT_WIDTH, totalHeight, 8).fill('#166534');
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF').text('TOTAL AMOUNT', PAGE_MARGIN + 18, totalTop + 10);
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#FFFFFF').text(totalFormatted, PAGE_MARGIN + 18, totalTop + 26, {
      width: CONTENT_WIDTH - 36,
      align: 'right',
    });

    // --- CONFIRMATION FOOTER ---
    const footerTop = totalTop + totalHeight + 14;
    const footerHeight = 42;
    doc.roundedRect(PAGE_MARGIN, footerTop, CONTENT_WIDTH, footerHeight, 6).fillAndStroke('#F0FDF4', '#BBF7D0');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534').text('ESCROW PAYMENT CONFIRMED & RELEASED', PAGE_MARGIN + 12, footerTop + 10);
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(
      `Delivery OTP confirmed on ${order.otpVerifiedAt ? formatStatementDateTime(order.otpVerifiedAt) : 'N/A'}. Payment released to ANI Accountant.`,
      PAGE_MARGIN + 12,
      footerTop + 24,
      { width: CONTENT_WIDTH - 24 }
    );

    doc.font('Helvetica').fontSize(7.5).fillColor('#9CA3AF').text(
      'This financial statement is an official digital record issued by Agricess Networking International (ANI). All funds are protected under ANI Escrow policy until delivery confirmation.',
      PAGE_MARGIN,
      footerTop + footerHeight + 12,
      { align: 'center', width: CONTENT_WIDTH }
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
