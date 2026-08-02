import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { DistributionLineStatus, DistributionRecipientRole } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';
import { notifyMoneyDistributed } from './notification.service';
import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import {
  calculateDistributionAmounts,
  FARMER_SHARE_PERCENT,
  handlerSharePercentOfTotal,
  aniPlatformSharePercentOfTotal,
  orderListingLabels,
} from '../utils/distributionFinancials';

const PAGE_MARGIN = 45;
const CONTENT_WIDTH = 505;
const PLATFORM_NAME = 'Agricess Network International - ANI';
const KEY_VALUE_LABEL_WIDTH = 155;
const KEY_VALUE_GAP = 28;
const KEY_VALUE_VALUE_X = PAGE_MARGIN + KEY_VALUE_LABEL_WIDTH + KEY_VALUE_GAP;
const KEY_VALUE_VALUE_WIDTH = CONTENT_WIDTH - KEY_VALUE_LABEL_WIDTH - KEY_VALUE_GAP;
const KEY_VALUE_ROW_HEIGHT = 15;
const PDF_COLORS = {
  text: '#111827',
  muted: '#6B7280',
  accent: '#166534',
};

function getLogoPath(): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'public', 'ani-logo.png'),
    path.join(process.cwd(), 'public', 'ani-logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function drawLogoWatermark(doc: PDFKit.PDFDocument, logoPath: string): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const logoSize = 300;
  doc.save();
  doc.opacity(0.07);
  doc.image(logoPath, pageWidth / 2 - logoSize / 2, pageHeight / 2 - logoSize / 2, {
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
  const textWidth = 560;
  doc.save();
  doc.opacity(0.05);
  doc.translate(pageWidth / 2, pageHeight / 2);
  doc.rotate(-35);
  doc.font('Helvetica-Bold').fontSize(26).fillColor(PDF_COLORS.accent);
  doc.text('Agricess Network International', -textWidth / 2, 130, {
    width: textWidth,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(PDF_COLORS.accent);
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

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF_COLORS.text);
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
  doc.font('Helvetica').fontSize(9).fillColor(PDF_COLORS.text);
  doc.text(`${label}:`, PAGE_MARGIN, y, { width: KEY_VALUE_LABEL_WIDTH, lineBreak: false });
  doc.font(options?.valueBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(PDF_COLORS.text);
  doc.text(value, KEY_VALUE_VALUE_X, y, { width: KEY_VALUE_VALUE_WIDTH });
  return y + KEY_VALUE_ROW_HEIGHT;
}

function formatPdfDateTime(date: Date): string {
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

function formatDistributionMessage(
  recipientFirstName: string,
  amount: number,
  buyerName: string,
  orderName: string
): string {
  const formatted = amount.toFixed(2);
  return `Dear ${recipientFirstName}, you have received GHC ${formatted} from ANI for the successful delivery of "${orderName}" (${buyerName} order).`;
}

type DistributionMessagePdfInput = {
  recipientName: string;
  recipientRoleLabel: string;
  amount: number;
  buyerName: string;
  orderName: string;
  orderId: string;
  transactionRef: string;
  distributedAt: Date;
  status: DistributionLineStatus;
  messageBody: string;
};

function buildDistributionMessagePdf(input: DistributionMessagePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = getLogoPath();
    drawPageWatermark(doc, logoPath);
    doc.on('pageAdded', () => drawPageWatermark(doc, logoPath));

    let y = drawHeaderLogo(doc, logoPath, 36);
    y += 4;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(PDF_COLORS.accent);
    doc.text(PLATFORM_NAME, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 24;

    doc.font('Helvetica').fontSize(11).fillColor(PDF_COLORS.text);
    doc.text('Distribution Payment Notice', PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 22;

    y = drawKeyValue(doc, 'Order ID', input.orderId, y);
    y = drawKeyValue(doc, 'Date', formatPdfDateTime(input.distributedAt), y);
    y = drawKeyValue(doc, 'Transaction ref', input.transactionRef, y);
    y = drawKeyValue(
      doc,
      'Status',
      input.status === 'DISTRIBUTED' ? 'Distributed' : 'Pending distribution',
      y
    );
    y += 10;

    y = drawSectionTitle(doc, 'Recipient', y);
    y = drawKeyValue(doc, 'Name', input.recipientName, y);
    y = drawKeyValue(doc, 'Role', input.recipientRoleLabel, y);
    y = drawKeyValue(doc, 'Amount', `GHC ${input.amount.toFixed(2)}`, y, { valueBold: true });
    y += 10;

    y = drawSectionTitle(doc, 'Order', y);
    y = drawKeyValue(doc, 'Order name', input.orderName, y);
    y = drawKeyValue(doc, 'Client', input.buyerName, y);
    y += 10;

    y = drawSectionTitle(doc, 'Notification message', y);
    doc.font('Helvetica').fontSize(10).fillColor(PDF_COLORS.text);
    doc.text(input.messageBody, PAGE_MARGIN, y, { width: CONTENT_WIDTH, lineGap: 4 });
    y += 48;

    doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted);
    doc.text(
      `This document is an official ${PLATFORM_NAME} distribution notice sent to the recipient listed above.`,
      PAGE_MARGIN,
      doc.page.height - PAGE_MARGIN - 14,
      { width: CONTENT_WIDTH, align: 'center' }
    );

    doc.end();
  });
}

export const distributeLineSchema = z.object({
  paymentMethod: z.string().min(1).max(100),
  transactionId: z.string().max(200).optional(),
});

function floDisplayName(firstName: string): string {
  return `FLO_${firstName}`;
}

function cloDisplayName(firstName: string): string {
  return `CLO_${firstName}`;
}

function handlerRecipientName(
  role: 'FARMER_HANDLER' | 'BUYER_HANDLER',
  agent: { firstName: string; lastName: string } | null | undefined
): string {
  if (!agent) return 'Unassigned';
  return role === 'FARMER_HANDLER' ? floDisplayName(agent.firstName) : cloDisplayName(agent.firstName);
}

async function loadReleasedOrder(orderId: string) {
  const order = assertFound(
    await prisma.productOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true } },
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            farmerProfile: { select: { farmName: true } },
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            media: { where: { type: 'IMAGE' }, orderBy: { orderIndex: 'asc' }, take: 1 },
          },
        },
      },
    }),
    'Order not found'
  );

  if (order.status !== 'PAID') {
    throw new AppError(400, 'Order must be paid before distributing funds');
  }
  if (!order.otpVerifiedAt || order.escrowStatus !== 'RELEASED') {
    throw new AppError(
      400,
      'Money distribution is available only after the order statement is released'
    );
  }

  return order;
}

async function resolveHandlers(farmerId: string, buyerId: string) {
  const [farmerHandler, buyerHandler] = await Promise.all([
    prisma.agentAssignment.findFirst({
      where: { ownerId: farmerId, relationshipType: 'FARMER_REPRESENTATIVE' },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.agentAssignment.findFirst({
      where: { ownerId: buyerId, relationshipType: 'BUYER_REPRESENTATIVE' },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return { farmerHandler, buyerHandler };
}

type DistributionLineSeed = {
  role: DistributionRecipientRole;
  percentage: number;
  amount: number;
  recipientUserId: string | null;
  recipientName: string;
};

function buildLineSeeds(
  totalAmount: number,
  order: Awaited<ReturnType<typeof loadReleasedOrder>>,
  handlers: Awaited<ReturnType<typeof resolveHandlers>>
): DistributionLineSeed[] {
  const farmerName = order.farmer.firstName;
  const hasFarmerHandler = Boolean(handlers.farmerHandler?.agent);
  const hasBuyerHandler = Boolean(handlers.buyerHandler?.agent);
  const farmerHandlerName = handlerRecipientName('FARMER_HANDLER', handlers.farmerHandler?.agent);
  const buyerHandlerName = handlerRecipientName('BUYER_HANDLER', handlers.buyerHandler?.agent);
  const amounts = calculateDistributionAmounts(totalAmount, {
    hasFarmerHandler,
    hasBuyerHandler,
  });

  return [
    {
      role: 'FARMER',
      percentage: FARMER_SHARE_PERCENT,
      amount: amounts.farmer,
      recipientUserId: order.farmer.id,
      recipientName: farmerName,
    },
    {
      role: 'FARMER_HANDLER',
      percentage: handlerSharePercentOfTotal({
        role: 'FARMER_HANDLER',
        hasFarmerHandler,
        hasBuyerHandler,
      }),
      amount: amounts.farmerHandler,
      recipientUserId: handlers.farmerHandler?.agent.id ?? null,
      recipientName: farmerHandlerName,
    },
    {
      role: 'BUYER_HANDLER',
      percentage: handlerSharePercentOfTotal({
        role: 'BUYER_HANDLER',
        hasFarmerHandler,
        hasBuyerHandler,
      }),
      amount: amounts.buyerHandler,
      recipientUserId: handlers.buyerHandler?.agent.id ?? null,
      recipientName: buyerHandlerName,
    },
    {
      role: 'ANI_PLATFORM',
      percentage: aniPlatformSharePercentOfTotal(totalAmount, {
        hasFarmerHandler,
        hasBuyerHandler,
      }),
      amount: amounts.aniPlatform,
      recipientUserId: null,
      recipientName: 'ANI',
    },
  ];
}

function roleLabel(
  role: DistributionRecipientRole,
  order?: Awaited<ReturnType<typeof loadReleasedOrder>>
): string {
  switch (role) {
    case 'FARMER':
      return order?.farmer.firstName ?? 'Fellow';
    case 'FARMER_HANDLER':
      return 'Fellow Liaison Officer';
    case 'BUYER_HANDLER':
      return 'Client Liaison Officer';
    case 'ANI_PLATFORM':
      return 'ANI';
    default:
      return role;
  }
}

export class OrderDistributionService {
  async getOrCreateDistribution(orderId: string) {
    const order = await loadReleasedOrder(orderId);
    const handlers = await resolveHandlers(order.farmerId, order.buyerId);
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;

    let distribution = await prisma.orderMoneyDistribution.findUnique({
      where: { orderId },
      include: {
        lines: {
          include: {
            recipient: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!distribution) {
      const seeds = buildLineSeeds(order.totalAmount, order, handlers);
      distribution = await prisma.orderMoneyDistribution.create({
        data: {
          orderId,
          totalAmount: order.totalAmount,
          lines: {
            create: seeds.map((seed) => ({
              role: seed.role,
              percentage: seed.percentage,
              amount: seed.amount,
              recipientUserId: seed.recipientUserId,
            })),
          },
        },
        include: {
          lines: {
            include: {
              recipient: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    const lineDetails = distribution.lines.map((line) => {
      const seed = buildLineSeeds(order.totalAmount, order, handlers).find(
        (s) => s.role === line.role
      );
      return {
        id: line.id,
        role: line.role,
        roleLabel: roleLabel(line.role, order),
        percentage: line.percentage,
        amount: line.amount,
        status: line.status,
        paymentMethod: line.paymentMethod,
        distributedAt: line.distributedAt?.toISOString() ?? null,
        transactionId: line.transactionId,
        recipientUserId: line.recipientUserId,
        recipientName: line.recipient
          ? line.role === 'FARMER_HANDLER'
            ? floDisplayName(line.recipient.firstName)
            : line.role === 'BUYER_HANDLER'
              ? cloDisplayName(line.recipient.firstName)
              : line.role === 'FARMER'
                ? line.recipient.firstName
                : `${line.recipient.firstName} ${line.recipient.lastName}`
          : seed?.recipientName ?? 'Unassigned',
        recipientEmail: line.recipient?.email ?? null,
        canDistribute: line.role !== 'ANI_PLATFORM' && Boolean(line.recipientUserId),
      };
    });

    const { orderName } = orderListingLabels(order.listing);

    return {
      orderId: order.id,
      orderName,
      buyerName,
      farmerName: `${order.farmer.firstName} ${order.farmer.lastName}`,
      totalAmount: distribution.totalAmount,
      allDistributed: lineDetails.every(
        (l) => l.status === 'DISTRIBUTED' || l.role === 'ANI_PLATFORM' || !l.canDistribute
      ),
      lines: lineDetails,
    };
  }

  async distributeLine(
    orderId: string,
    lineId: string,
    data: z.infer<typeof distributeLineSchema>
  ) {
    const order = await loadReleasedOrder(orderId);
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;

    const line = assertFound(
      await prisma.orderDistributionLine.findFirst({
        where: { id: lineId, distribution: { orderId } },
        include: {
          recipient: { select: { id: true, firstName: true, lastName: true } },
          distribution: true,
        },
      }),
      'Distribution line not found'
    );

    if (line.role === 'ANI_PLATFORM') {
      throw new AppError(400, 'ANI platform share is retained automatically');
    }
    if (!line.recipientUserId || !line.recipient) {
      throw new AppError(400, 'No recipient assigned for this distribution line');
    }
    if (line.status === 'DISTRIBUTED') {
      throw new AppError(400, 'This distribution has already been completed');
    }

    const transactionId =
      data.transactionId?.trim() ||
      `DIST-${Date.now()}-${line.id.slice(0, 6).toUpperCase()}`;

    await prisma.orderDistributionLine.update({
      where: { id: lineId },
      data: {
        status: 'DISTRIBUTED' as DistributionLineStatus,
        paymentMethod: data.paymentMethod,
        transactionId,
        distributedAt: new Date(),
      },
    });

    const { orderName } = orderListingLabels(order.listing);
    const normalized = normalizeImages(order.listing.images);
    const imageFromMedia = order.listing.media?.[0]?.url;
    const imageUrl = imageFromMedia
      ? normalizePublicAssetUrl(imageFromMedia)
      : normalized[0]
        ? normalizePublicAssetUrl(normalized[0])
        : null;

    await notifyMoneyDistributed(
      line.recipientUserId,
      line.recipient.firstName,
      line.amount,
      buyerName,
      orderName,
      {
        totalAmount: order.totalAmount,
        quantity: order.quantity,
        unit: order.unit,
        imageUrl,
        listingId: order.listing.id,
      }
    );

    return this.getOrCreateDistribution(orderId);
  }

  async distributeAll(orderId: string, paymentMethod: string) {
    const snapshot = await this.getOrCreateDistribution(orderId);
    const pending = snapshot.lines.filter(
      (l) => l.canDistribute && l.status !== 'DISTRIBUTED'
    );

    for (const line of pending) {
      await this.distributeLine(orderId, line.id, { paymentMethod });
    }

    return this.getOrCreateDistribution(orderId);
  }

  async generateMessagePdf(orderId: string, lineId: string) {
    const order = await loadReleasedOrder(orderId);
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;
    const { orderName } = orderListingLabels(order.listing);

    const line = assertFound(
      await prisma.orderDistributionLine.findFirst({
        where: { id: lineId, distribution: { orderId } },
        include: {
          recipient: { select: { firstName: true, lastName: true } },
        },
      }),
      'Distribution line not found'
    );

    if (line.role === 'ANI_PLATFORM') {
      throw new AppError(400, 'No recipient message for ANI platform share');
    }

    const recipientFirstName = line.recipient?.firstName ?? 'Recipient';
    let recipientName = recipientFirstName;
    if (line.recipient) {
      if (line.role === 'FARMER_HANDLER') {
        recipientName = floDisplayName(line.recipient.firstName);
      } else if (line.role === 'BUYER_HANDLER') {
        recipientName = cloDisplayName(line.recipient.firstName);
      } else if (line.role === 'FARMER') {
        recipientName = line.recipient.firstName;
      } else {
        recipientName = `${line.recipient.firstName} ${line.recipient.lastName}`;
      }
    }

    const messageBody = formatDistributionMessage(
      recipientFirstName,
      line.amount,
      buyerName,
      orderName
    );

    const transactionRef =
      line.transactionId?.trim() ||
      `PENDING-${line.id.slice(0, 8).toUpperCase()}`;

    const buffer = await buildDistributionMessagePdf({
      recipientName,
      recipientRoleLabel: roleLabel(line.role, order),
      amount: line.amount,
      buyerName,
      orderName,
      orderId: order.id,
      transactionRef,
      distributedAt: line.distributedAt ?? new Date(),
      status: line.status,
      messageBody,
    });

    const filename = `ani-distribution-${orderId.slice(0, 8)}-${lineId.slice(0, 8)}.pdf`;
    return { buffer, filename };
  }
}

export const orderDistributionService = new OrderDistributionService();
