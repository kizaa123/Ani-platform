import { z } from 'zod';
import prisma from '../database/prisma';
import { assertAuthorized } from '../utils/errors';
import { ROLES } from '../constants/roles';
import {
  getUserDisplayName,
  notifyChatMessage,
} from './notification.service';
export const messageSchema = z.object({
  receiverId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export class ChatService {
  private async canMessage(userId: string, roleId: number, partnerId: string): Promise<boolean> {
    const direct = await prisma.connectionRequest.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { buyerId: userId, farmerId: partnerId },
          { buyerId: partnerId, farmerId: userId },
        ],
      },
    });
    if (direct) return true;

    if (roleId === ROLES.FARMER_HANDLER) {
      const assignments = await prisma.agentAssignment.findMany({
        where: { agentId: userId, relationshipType: 'FARMER_REPRESENTATIVE' },
        select: { ownerId: true },
      });
      const farmerIds = assignments.map((a) => a.ownerId);
      if (farmerIds.length === 0) return false;

      const viaClient = await prisma.connectionRequest.findFirst({
        where: {
          status: 'ACCEPTED',
          buyerId: partnerId,
          farmerId: { in: farmerIds },
        },
      });
      return !!viaClient;
    }

    if (roleId === ROLES.BUYER) {
      const viaHandler = await prisma.connectionRequest.findFirst({
        where: {
          status: 'ACCEPTED',
          buyerId: userId,
          farmer: {
            ownedAssignments: {
              some: {
                agentId: partnerId,
                relationshipType: 'FARMER_REPRESENTATIVE',
              },
            },
          },
        },
      });
      if (viaHandler) return true;

      const buyerHandler = await prisma.agentAssignment.findFirst({
        where: {
          ownerId: userId,
          agentId: partnerId,
          relationshipType: 'BUYER_REPRESENTATIVE',
        },
      });
      if (buyerHandler) return true;
    }

    if (roleId === ROLES.BUYER_HANDLER) {
      const buyerClients = await prisma.agentAssignment.findMany({
        where: { agentId: userId, relationshipType: 'BUYER_REPRESENTATIVE' },
        select: { ownerId: true },
      });
      const buyerIds = buyerClients.map((a) => a.ownerId);
      if (buyerIds.includes(partnerId)) return true;

      if (buyerIds.length === 0) return false;

      const viaClient = await prisma.connectionRequest.findFirst({
        where: {
          status: 'ACCEPTED',
          buyerId: { in: buyerIds },
          farmerId: partnerId,
        },
      });
      return !!viaClient;
    }

    return false;
  }

  private async assertCanMessage(userId: string, roleId: number, partnerId: string) {
    const allowed = await this.canMessage(userId, roleId, partnerId);
    assertAuthorized(allowed, 'Messaging requires an accepted connection');
  }

  async send(senderId: string, roleId: number, data: z.infer<typeof messageSchema>) {
    await this.assertCanMessage(senderId, roleId, data.receiverId);

    const msg = await prisma.message.create({
      data: { senderId, receiverId: data.receiverId, message: data.message },
    });

    const senderName = await getUserDisplayName(senderId);
    await notifyChatMessage(data.receiverId, senderId, senderName, data.message);

    return msg;
  }

  async getConversation(userId: string, roleId: number, partnerId: string) {
    await this.assertCanMessage(userId, roleId, partnerId);

    return prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}

export const chatService = new ChatService();
