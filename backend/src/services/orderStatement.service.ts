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
  isMarketplaceBuyerRole,
} from '../constants/roles';
import { notifyOrderPaymentReleased } from './notification.service';

type OrderForStatement = NonNullable<Awaited<ReturnType<typeof loadOrderForStatement>>>;

const PAGE_MARGIN = 45;
const CONTENT_WIDTH = 505;
const CONTENT_RIGHT = PAGE_MARGIN + CONTENT_WIDTH;

const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  sectionBg: '#F9FAFB',
  accent: '#166534',
  accentLight: '#DCFCE7',
  totalBar: '#166534',
  white: '#FFFFFF',
};

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

function drawTextWatermark(doc: PDFKit.PDFDocument): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  doc.save();
  doc.opacity(0.06);
  doc.font('Helvetica-Bold').fontSize(72).fillColor('#166534');
  doc.rotate(-35, { origin: [centerX, centerY] });
  doc.text('ANI Platform', centerX - 220, centerY - 36, {
    width: 440,
    align: 'center',
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

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatPaymentMethod(method: string): string {
  return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEscrowStatus(status: string): string {
  if (status === 'RELEASED') return 'Released to ANI Accountant';
  if (status === 'HELD') return 'Held in escrow';
  return status.replace(/_/g, ' ');
}

function resolveTransactionRef(order: OrderForStatement): string {
  if (order.transactionId) return order.transactionId;
  return `MOCK-${Date.now()}-${order.id.slice(0, 6).toUpperCase()}`;
}

function formatCommodityLabel(order: OrderForStatement): string {
  const commodity = order.listing.commodity.name;
  const category = order.listing.commodity.category.name;
  return `${commodity} (${category})`;
}

function formatFarmerDisplayName(order: OrderForStatement): string {
  const name = `${order.farmer.firstName} ${order.farmer.lastName}`;
  const farmName = order.farmer.farmerProfile?.farmName;
  return farmName ? `${name} (${farmName})` : name;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.accent);
  doc.text(title, PAGE_MARGIN, y);
  const lineY = y + 14;
  doc.moveTo(PAGE_MARGIN, lineY).lineTo(CONTENT_RIGHT, lineY).strokeColor(COLORS.border).lineWidth(0.75).stroke();
  return lineY + 10;
}

function drawKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number,
  options?: { valueBold?: boolean; valueColor?: string }
): number {
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
  doc.text(`${label}:`, PAGE_MARGIN + 4, y, { continued: true, width: 130 });
  doc.font(options?.valueBold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(9)
    .fillColor(options?.valueColor ?? COLORS.text);
  doc.text(` ${value}`, { width: CONTENT_WIDTH - 140 });
  return y + 16;
}

export function buildOrderStatementPdf(order: OrderForStatement): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawTextWatermark(doc);
    doc.on('pageAdded', () => drawTextWatermark(doc));

    const logoPath = getLogoPath();
    const totalFormatted = `GHC ${order.totalAmount.toFixed(2)}`;
    const transactionRef = resolveTransactionRef(order);

    // --- HEADER ---
    let y = 38;
    if (logoPath) {
      doc.image(logoPath, PAGE_MARGIN, y, { width: 44 });
    }

    const headerTextLeft = logoPath ? PAGE_MARGIN + 54 : PAGE_MARGIN;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.text);
    doc.text('ANI Platform', headerTextLeft, y);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
    doc.text('Official Financial Statement', headerTextLeft, y + 18);

    y += 48;
    doc.moveTo(PAGE_MARGIN, y).lineTo(CONTENT_RIGHT, y).strokeColor(COLORS.border).lineWidth(1).stroke();
    y += 16;

    // --- ORDER METADATA ---
    y = drawKeyValue(doc, 'Order ID', order.id, y);
    y = drawKeyValue(doc, 'Date', formatDateTime(order.createdAt), y);
    y = drawKeyValue(doc, 'Transaction', transactionRef, y, { valueBold: true });
    y += 8;

    // --- ORDER DETAILS ---
    y = drawSectionTitle(doc, 'Order Details', y);
    y = drawKeyValue(doc, 'Product', order.listing.title, y);
    y = drawKeyValue(doc, 'Commodity', formatCommodityLabel(order), y);
    y = drawKeyValue(doc, 'Quantity', `${order.quantity} ${order.unit}`, y);
    y = drawKeyValue(doc, 'Unit price', `GHC ${order.unitPrice.toFixed(2)}`, y);
    y = drawKeyValue(doc, 'Total amount', totalFormatted, y, { valueBold: true });
    y = drawKeyValue(doc, 'Payment method', formatPaymentMethod(order.paymentMethod), y);
    y += 8;

    // --- PROMINENT TOTAL AMOUNT PAID ---
    const totalBarHeight = 56;
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, totalBarHeight, 6).fill(COLORS.totalBar);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#BBF7D0');
    doc.text('TOTAL AMOUNT PAID', PAGE_MARGIN + 16, y + 10);
    doc.font('Helvetica-Bold').fontSize(26).fillColor(COLORS.white);
    doc.text(totalFormatted, PAGE_MARGIN + 16, y + 24, {
      width: CONTENT_WIDTH - 32,
      align: 'right',
    });
    y += totalBarHeight + 16;

    // --- FROM (BUYER) ---
    y = drawSectionTitle(doc, 'From (Buyer)', y);
    y = drawKeyValue(doc, 'Name', `${order.buyer.firstName} ${order.buyer.lastName}`, y, { valueBold: true });
    y = drawKeyValue(doc, 'Location', formatLocation(order.buyer), y);
    y += 8;

    // --- TO (FARMER) ---
    y = drawSectionTitle(doc, 'To (Farmer)', y);
    y = drawKeyValue(doc, 'Name', formatFarmerDisplayName(order), y, { valueBold: true });
    y = drawKeyValue(doc, 'Location', formatLocation(order.farmer), y);
    y += 8;

    // --- PAYMENT & ESCROW ---
    y = drawSectionTitle(doc, 'Payment & Escrow', y);
    y = drawKeyValue(doc, 'Order status', order.status, y, { valueBold: true });
    y = drawKeyValue(doc, 'Escrow status', formatEscrowStatus(order.escrowStatus), y, {
      valueBold: true,
      valueColor: COLORS.accent,
    });
    y = drawKeyValue(
      doc,
      'Delivery confirmed',
      order.otpVerifiedAt ? formatDateTime(order.otpVerifiedAt) : '—',
      y
    );
    y = drawKeyValue(
      doc,
      'Funds released',
      order.paymentReleasedAt ? formatDateTime(order.paymentReleasedAt) : '—',
      y
    );
    y += 16;

    // --- FOOTER DISCLAIMER ---
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 36, 4).fillAndStroke(COLORS.sectionBg, COLORS.border);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
    doc.text(
      'This document is an official ANI Platform financial record. Funds are held in escrow until the buyer confirms delivery.',
      PAGE_MARGIN + 12,
      y + 10,
      { width: CONTENT_WIDTH - 24, align: 'center' }
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
    isMarketplaceBuyerRole(roleId) &&
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
  assertAuthorized(isMarketplaceBuyerRole(roleId), 'Only buyers and researchers can release order payments');

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
