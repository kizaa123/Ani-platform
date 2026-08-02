import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import { verifyReleaseOtp } from '../utils/orderOtp';
import {
  isFarmerHandler,
  isBuyerHandler,
  isStaffRole,
  isMarketplaceBuyerRole,
  canPurchaseFromMarketplace,
} from '../constants/roles';
import { notifyOrderPaymentReleased } from './notification.service';
import {
  fetchCounterpartHandlerForOwner,
  type CounterpartHandlerContact,
} from '../utils/counterpartHandler';
import { listingCommodityName, listingCommodityCategory } from '../utils/listingDisplay';

type OrderForStatement = NonNullable<Awaited<ReturnType<typeof loadOrderForStatement>>>;

/** Who is viewing the receipt - drives payment status wording. */
export type StatementViewerPerspective = 'sender' | 'receiver' | 'admin';

const PAGE_MARGIN = 45;
const CONTENT_WIDTH = 505;

const PLATFORM_NAME = 'Agricess Network International - ANI';
const PLATFORM_SHORT_NAME = 'Agricess Network International - ANI';

/** Fixed label column + gap before values for readable alignment. */
const KEY_VALUE_LABEL_WIDTH = 155;
const KEY_VALUE_GAP = 28;
const KEY_VALUE_VALUE_X = PAGE_MARGIN + KEY_VALUE_LABEL_WIDTH + KEY_VALUE_GAP;
const KEY_VALUE_VALUE_WIDTH = CONTENT_WIDTH - KEY_VALUE_LABEL_WIDTH - KEY_VALUE_GAP;
const KEY_VALUE_ROW_HEIGHT = 15;

const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  accent: '#166534',
};

function getLogoPath(): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'public', 'ani-logo.png'),
    path.join(process.cwd(), 'public', 'ani-logo.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function drawLogoWatermark(doc: PDFKit.PDFDocument, logoPath: string): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const logoSize = 300;
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  doc.save();
  doc.opacity(0.07);
  doc.image(logoPath, centerX - logoSize / 2, centerY - logoSize / 2, {
    width: logoSize,
    height: logoSize,
    fit: [logoSize, logoSize],
    align: 'center',
    valign: 'center',
  });
  doc.restore();
}

function drawPlatformNameWatermark(doc: PDFKit.PDFDocument): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  const textWidth = 560;

  doc.save();
  doc.opacity(0.05);
  doc.translate(centerX, centerY);
  doc.rotate(-35);

  doc.font('Helvetica-Bold').fontSize(26).fillColor(COLORS.accent);
  doc.text('Agricess Network International', -textWidth / 2, 130, {
    width: textWidth,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.accent);
  doc.text('- ANI', -textWidth / 2, 162, { width: textWidth, align: 'center' });

  doc.restore();
}

function drawPageWatermark(doc: PDFKit.PDFDocument, logoPath: string | null): void {
  if (logoPath) drawLogoWatermark(doc, logoPath);
  drawPlatformNameWatermark(doc);
}

function drawHeaderLogo(doc: PDFKit.PDFDocument, logoPath: string | null, y: number): number {
  if (logoPath) {
    const logoSize = 68;
    doc.image(logoPath, PAGE_MARGIN, y, {
      width: logoSize,
      height: logoSize,
      fit: [logoSize, logoSize],
    });
    return y + logoSize + 8;
  }
  return y;
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
  return [user.city, user.region, user.country].filter(Boolean).join(', ') || '-';
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
  const commodity = listingCommodityName(order.listing);
  const category = listingCommodityCategory(order.listing);
  return `${commodity} (${category})`;
}

function formatFarmerDisplayName(order: OrderForStatement): string {
  const name = `${order.farmer.firstName} ${order.farmer.lastName}`;
  const farmName = order.farmer.farmerProfile?.farmName;
  return farmName ? `${name} (${farmName})` : name;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text);
  doc.text(title, PAGE_MARGIN, y, { underline: true });
  return y + 18;
}

function drawKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number,
  options?: { valueBold?: boolean }
): number {
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  doc.text(`${label}:`, PAGE_MARGIN, y, { width: KEY_VALUE_LABEL_WIDTH, lineBreak: false });

  doc.font(options?.valueBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLORS.text);
  doc.text(value, KEY_VALUE_VALUE_X, y, { width: KEY_VALUE_VALUE_WIDTH });

  return y + KEY_VALUE_ROW_HEIGHT;
}

export function resolveStatementViewerPerspective(
  userId: string,
  roleId: number,
  order: { buyerId: string; farmerId: string }
): StatementViewerPerspective {
  if (isStaffRole(roleId)) return 'admin';
  if (order.buyerId === userId || isBuyerHandler(roleId)) return 'sender';
  if (order.farmerId === userId || isFarmerHandler(roleId)) return 'receiver';
  return 'admin';
}

function paymentStatusMessage(perspective: StatementViewerPerspective): string {
  if (perspective === 'sender') return 'Payment made successfully';
  if (perspective === 'receiver') return 'Payment received successfully';
  return 'Payment completed successfully';
}

function formatDeliveryReleaseSentence(order: OrderForStatement): string {
  const deliveryDate = order.otpVerifiedAt ? formatDateTime(order.otpVerifiedAt) : null;
  const releaseDate = order.paymentReleasedAt ? formatDateTime(order.paymentReleasedAt) : null;

  if (deliveryDate && releaseDate) {
    return `Delivery confirmed on ${deliveryDate}; funds released on ${releaseDate}.`;
  }
  if (deliveryDate) {
    return `Delivery confirmed on ${deliveryDate}; funds release pending.`;
  }
  if (releaseDate) {
    return `Funds released on ${releaseDate}; delivery confirmation pending.`;
  }
  return 'Delivery and fund release pending.';
}

function drawPaymentStatus(
  doc: PDFKit.PDFDocument,
  perspective: StatementViewerPerspective,
  y: number
): number {
  const message = paymentStatusMessage(perspective);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.accent);
  doc.text(message, PAGE_MARGIN, y, { width: CONTENT_WIDTH });

  return y + KEY_VALUE_ROW_HEIGHT + 4;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
  doc.text(
    `This document is an official ${PLATFORM_SHORT_NAME} financial record. Funds are held in escrow until the client confirms delivery.`,
    PAGE_MARGIN,
    doc.page.height - PAGE_MARGIN - 14,
    { width: CONTENT_WIDTH, align: 'center' }
  );
}

export function buildOrderStatementPdf(
  order: OrderForStatement,
  perspective: StatementViewerPerspective
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = getLogoPath();
    drawPageWatermark(doc, logoPath);
    doc.on('pageAdded', () => drawPageWatermark(doc, logoPath));

    const totalFormatted = `GHC ${order.totalAmount.toFixed(2)}`;
    const transactionRef = resolveTransactionRef(order);

    let y = drawHeaderLogo(doc, logoPath, 36);
    y += 4;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.accent);
    doc.text(PLATFORM_NAME, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 24;

    doc.font('Helvetica').fontSize(11).fillColor(COLORS.text);
    doc.text('Financial Statement / Order Receipt', PAGE_MARGIN, y, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
    y += 20;

    y = drawPaymentStatus(doc, perspective, y);
    y += 12;

    y = drawKeyValue(doc, 'Order ID', order.id, y);
    y = drawKeyValue(doc, 'Date', formatDateTime(order.createdAt), y);
    y = drawKeyValue(doc, 'Transaction', transactionRef, y);
    y += 10;

    y = drawSectionTitle(doc, 'Order Details', y);
    y = drawKeyValue(doc, 'Product', order.listing.title, y);
    y = drawKeyValue(doc, 'Commodity', formatCommodityLabel(order), y);
    y = drawKeyValue(doc, 'Quantity', `${order.quantity} ${order.unit}`, y);
    y = drawKeyValue(doc, 'Unit price', `GHC ${order.unitPrice.toFixed(2)}`, y);
    y = drawKeyValue(doc, 'Total amount', totalFormatted, y, { valueBold: true });
    y = drawKeyValue(doc, 'Payment method', formatPaymentMethod(order.paymentMethod), y);
    y += 10;

    y = drawSectionTitle(doc, 'From (Client)', y);
    y = drawKeyValue(doc, 'Name', `${order.buyer.firstName} ${order.buyer.lastName}`, y);
    y = drawKeyValue(doc, 'Location', formatLocation(order.buyer), y);
    y += 10;

    y = drawSectionTitle(doc, 'To (Fellow)', y);
    y = drawKeyValue(doc, 'Name', formatFarmerDisplayName(order), y);
    y = drawKeyValue(doc, 'Location', formatLocation(order.farmer), y);
    y += 10;

    y = drawSectionTitle(doc, 'Payment & Escrow', y);
    y = drawKeyValue(doc, 'Order status', order.status, y);
    y = drawKeyValue(doc, 'Escrow status', formatEscrowStatus(order.escrowStatus), y);
    y += 10;

    y = drawSectionTitle(doc, 'Delivery & Release', y);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    doc.text(formatDeliveryReleaseSentence(order), PAGE_MARGIN, y, { width: CONTENT_WIDTH });
    y += KEY_VALUE_ROW_HEIGHT + 4;

    drawFooter(doc);

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
      'Financial statement (PDF) is locked until the client confirms the delivery release OTP.'
    );
  }

  const perspective = resolveStatementViewerPerspective(userId, roleId, order);
  const buffer = await buildOrderStatementPdf(order, perspective);
  const filename = `ani-order-${orderId.slice(0, 8)}.pdf`;
  return { buffer, filename };
}

export async function getOrderDetail(orderId: string, userId: string, roleId: number) {
  const order = await assertOrderStatementAccess(userId, roleId, orderId);
  const canRelease =
    canPurchaseFromMarketplace(roleId) &&
    order.buyerId === userId &&
    order.status === 'PAID' &&
    order.escrowStatus === 'HELD';

  let counterpartHandler: CounterpartHandlerContact | null = null;
  if (isFarmerHandler(roleId)) {
    counterpartHandler = await fetchCounterpartHandlerForOwner(
      order.buyerId,
      'BUYER_REPRESENTATIVE'
    );
  } else if (isBuyerHandler(roleId)) {
    counterpartHandler = await fetchCounterpartHandlerForOwner(
      order.farmerId,
      'FARMER_REPRESENTATIVE'
    );
  }

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
    counterpartHandler,
  };
}

export async function releaseOrderPayment(
  orderId: string,
  buyerId: string,
  roleId: number,
  otp: string
) {
  assertAuthorized(canPurchaseFromMarketplace(roleId), 'Only marketplace purchasers can release order payments');

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
