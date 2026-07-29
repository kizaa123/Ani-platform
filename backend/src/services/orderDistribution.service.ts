import { z } from 'zod';
import { DistributionLineStatus, DistributionRecipientRole } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';
import { notifyMoneyDistributed } from './notification.service';
import { orderListingLabels } from '../utils/distributionFinancials';

const FARMER_SHARE = 66.66;
const FARMER_HANDLER_SHARE = 10;
const BUYER_HANDLER_SHARE = 10;
const ANI_SHARE = 100 - FARMER_SHARE - FARMER_HANDLER_SHARE - BUYER_HANDLER_SHARE;

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

function roundAmount(total: number, percentage: number): number {
  return Math.round((total * percentage) / 100 * 100) / 100;
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
        listing: { select: { title: true, description: true } },
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
  const farmerHandlerName = handlerRecipientName('FARMER_HANDLER', handlers.farmerHandler?.agent);
  const buyerHandlerName = handlerRecipientName('BUYER_HANDLER', handlers.buyerHandler?.agent);

  return [
    {
      role: 'FARMER',
      percentage: FARMER_SHARE,
      amount: roundAmount(totalAmount, FARMER_SHARE),
      recipientUserId: order.farmer.id,
      recipientName: farmerName,
    },
    {
      role: 'FARMER_HANDLER',
      percentage: FARMER_HANDLER_SHARE,
      amount: roundAmount(totalAmount, FARMER_HANDLER_SHARE),
      recipientUserId: handlers.farmerHandler?.agent.id ?? null,
      recipientName: farmerHandlerName,
    },
    {
      role: 'BUYER_HANDLER',
      percentage: BUYER_HANDLER_SHARE,
      amount: roundAmount(totalAmount, BUYER_HANDLER_SHARE),
      recipientUserId: handlers.buyerHandler?.agent.id ?? null,
      recipientName: buyerHandlerName,
    },
    {
      role: 'ANI_PLATFORM',
      percentage: ANI_SHARE,
      amount: roundAmount(totalAmount, ANI_SHARE),
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

    const { orderName, orderDescription } = orderListingLabels(order.listing);

    return {
      orderId: order.id,
      orderName,
      orderDescription,
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

    const { orderName, orderDescription } = orderListingLabels(order.listing);

    await notifyMoneyDistributed(
      line.recipientUserId,
      line.recipient.firstName,
      line.amount,
      buyerName,
      orderName,
      orderDescription
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
}

export const orderDistributionService = new OrderDistributionService();
