import prisma from '../database/prisma';
import { assertFound } from '../utils/errors';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { STAFF_ROLES } from '../constants/roles';

export type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  type:
    | 'CHAT_MESSAGE'
    | 'NEW_ORDER'
    | 'ORDER_TRACKED'
    | 'CONNECTION_REQUEST'
    | 'CONNECTION_APPROVED'
    | 'CONNECTION_DECLINED'
    | 'FARM_ACCESS_PAID'
    | 'PRODUCT_PURCHASE'
    | 'RESEARCH_PURCHASE';
  title: string;
  body: string;
  link?: string | null;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    },
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
    },
  });
}

export async function notifyUsers(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
  const uniqueIds = [...new Set(userIds)];
  await Promise.all(
    uniqueIds.map((userId) => createNotification({ ...input, userId }).catch(() => undefined))
  );
}

export async function notifyFarmerTeam(
  farmerId: string,
  input: Omit<CreateNotificationInput, 'userId'>
) {
  const handlers = await prisma.agentAssignment.findMany({
    where: { ownerId: farmerId, relationshipType: 'FARMER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  const userIds = [farmerId, ...handlers.map((h) => h.agentId)];
  await notifyUsers(userIds, input);
}

export class NotificationService {
  async listForUser(userId: string, limit = 50) {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
      },
    });

    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor
        ? {
            id: n.actor.id,
            firstName: n.actor.firstName,
            lastName: n.actor.lastName,
            profilePicture: normalizePublicAssetUrl(n.actor.profilePicture),
          }
        : null,
    }));
  }

  async unreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(notificationId: string, userId: string) {
    const row = assertFound(
      await prisma.notification.findFirst({
        where: { id: notificationId, userId },
      }),
      'Notification not found'
    );
    return prisma.notification.update({
      where: { id: row.id },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}

export const notificationService = new NotificationService();

function formatName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export async function notifyChatMessage(
  receiverId: string,
  senderId: string,
  senderName: string,
  preview: string
) {
  await createNotification({
    userId: receiverId,
    actorId: senderId,
    type: 'CHAT_MESSAGE',
    title: 'New message',
    body: `${senderName}: ${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}`,
    link: '/connections',
  }).catch(() => undefined);
}

export async function notifyNewOrder(
  farmerId: string,
  buyerId: string,
  buyerName: string,
  productName: string,
  totalAmount: number
) {
  const body = `${buyerName} ordered ${productName} — GHC ${totalAmount.toFixed(2)} added to your financial statement.`;
  await notifyFarmerTeam(farmerId, {
    actorId: buyerId,
    type: 'NEW_ORDER',
    title: 'New buyer order',
    body,
    link: '/farm/orders',
  });
}

export async function notifyProductPurchase(
  buyerId: string,
  farmerId: string,
  farmerName: string,
  productName: string,
  totalAmount: number
) {
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: 'PRODUCT_PURCHASE',
    title: 'Purchase recorded',
    body: `You purchased ${productName} from ${farmerName} for GHC ${totalAmount.toFixed(2)}. View your financial statement for details.`,
    link: '/financials',
  }).catch(() => undefined);
}

export async function notifyOrderTracked(
  buyerId: string,
  farmerId: string,
  farmerName: string,
  productName: string,
  stageLabel: string
) {
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: 'ORDER_TRACKED',
    title: 'Order update',
    body: `${farmerName} updated your order for ${productName} — now at "${stageLabel}".`,
    link: '/orders',
  }).catch(() => undefined);
}

export async function notifyConnectionRequest(
  farmerId: string,
  buyerId: string,
  buyerName: string
) {
  await notifyFarmerTeam(farmerId, {
    actorId: buyerId,
    type: 'CONNECTION_REQUEST',
    title: 'New farm access request',
    body: `${buyerName} requested access to your farm. ANI admin will review the request — no action needed from you.`,
    link: '/connections',
  });
}

export async function notifyAdminsConnectionRequest(
  buyerId: string,
  buyerName: string,
  farmerId: string,
  farmerName: string
) {
  const staff = await prisma.user.findMany({
    where: { roleId: { in: [...STAFF_ROLES] } },
    select: { id: true },
  });
  await notifyUsers(
    staff.map((s) => s.id),
    {
      actorId: buyerId,
      type: 'CONNECTION_REQUEST',
      title: 'Farm access request pending',
      body: `${buyerName} requested access to ${farmerName}'s farm. Review and approve on Connections or Admin.`,
      link: '/admin',
    }
  );
}

export async function notifyConnectionApproved(
  buyerId: string,
  farmerId: string,
  farmerName: string
) {
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: 'CONNECTION_APPROVED',
    title: 'Farm access approved',
    body: `ANI approved your access to ${farmerName}'s farm. You can now browse products and message them.`,
    link: '/connections',
  }).catch(() => undefined);
}

export async function notifyConnectionDeclined(
  buyerId: string,
  farmerId: string,
  farmerName: string
) {
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: 'CONNECTION_DECLINED',
    title: 'Farm access declined',
    body: `Your access request for ${farmerName}'s farm was declined by ANI.`,
    link: '/connections',
  }).catch(() => undefined);
}

export async function notifyFarmAccessPaid(
  buyerId: string,
  farmerId: string,
  buyerName: string,
  farmerName: string,
  amount: number
) {
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: 'FARM_ACCESS_PAID',
    title: 'Farm access payment',
    body: `You paid GHC ${amount.toFixed(2)} for access to ${farmerName}. Recorded on your financial statement — awaiting ANI admin approval.`,
    link: '/financials',
  }).catch(() => undefined);

  await notifyConnectionRequest(farmerId, buyerId, buyerName);
  await notifyAdminsConnectionRequest(buyerId, buyerName, farmerId, farmerName);
}

export async function notifyResearchPurchase(
  researcherId: string,
  studentId: string,
  studentName: string,
  publicationTitle: string,
  amount: number
) {
  await createNotification({
    userId: researcherId,
    actorId: studentId,
    type: 'RESEARCH_PURCHASE',
    title: 'Publication purchased',
    body: `${studentName} paid GHC ${amount.toFixed(2)} for "${publicationTitle}".`,
    link: '/researcher/financials',
  }).catch(() => undefined);

  await createNotification({
    userId: studentId,
    actorId: researcherId,
    type: 'RESEARCH_PURCHASE',
    title: 'Access granted',
    body: `You now have access to "${publicationTitle}".`,
    link: '/library',
  }).catch(() => undefined);
}

export async function getUserDisplayName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  return user ? formatName(user.firstName, user.lastName) : 'Someone';
}
