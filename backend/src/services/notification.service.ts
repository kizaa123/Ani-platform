import { Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import { assertFound } from '../utils/errors';
import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { buyerFarmAccessSet } from '../middleware/access.middleware';
import {
  FARMER_ROLES,
  MARKETPLACE_BUYER_ROLES,
  ROLES,
  STAFF_ROLES,
} from '../constants/roles';

export type NotificationMetadata = {
  imageUrl?: string | null;
  price?: number | null;
  priceLabel?: string | null;
  farmerId?: string | null;
  farmerUserId?: string | null;
  listingId?: string | null;
  publicationId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  farmSize?: string | null;
  location?: string | null;
  commodities?: string[] | null;
  farmerName?: string | null;
};

export type NotificationTypeValue =
  | 'CHAT_MESSAGE'
  | 'NEW_ORDER'
  | 'ORDER_TRACKED'
  | 'ORDER_PAYMENT_RELEASED'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_APPROVED'
  | 'CONNECTION_DECLINED'
  | 'FARM_ACCESS_PAID'
  | 'PRODUCT_PURCHASE'
  | 'RESEARCH_PURCHASE'
  | 'NEW_PRODUCT'
  | 'NEW_FARMER'
  | 'NEW_PUBLICATION';

export type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  type: NotificationTypeValue;
  title: string;
  body: string;
  link?: string | null;
  metadata?: NotificationMetadata | null;
};

function toMetadataJson(metadata?: NotificationMetadata | null): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  return metadata as Prisma.InputJsonValue;
}

function parseMetadata(value: Prisma.JsonValue | null): NotificationMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as NotificationMetadata;
}

function formatMetadata(metadata: NotificationMetadata | null): NotificationMetadata | null {
  if (!metadata) return null;
  return {
    ...metadata,
    imageUrl: metadata.imageUrl ? normalizePublicAssetUrl(metadata.imageUrl) : metadata.imageUrl,
  };
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      metadata: toMetadataJson(input.metadata),
    },
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
    },
  });
}

export async function notifyUsers(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
  const uniqueIds = [...new Set(userIds)].filter((id) => id !== input.actorId);
  await Promise.all(
    uniqueIds.map((userId) => createNotification({ ...input, userId }).catch(() => undefined))
  );
}

export async function notifyUsersByRoles(
  roleIds: readonly number[],
  input: Omit<CreateNotificationInput, 'userId'>,
  excludeUserId?: string | null
) {
  const users = await prisma.user.findMany({
    where: { roleId: { in: [...roleIds] } },
    select: { id: true },
  });
  const userIds = users
    .map((u) => u.id)
    .filter((id) => id !== excludeUserId && id !== input.actorId);
  await notifyUsers(userIds, input);
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
      metadata: formatMetadata(parseMetadata(n.metadata)),
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

function formatLocation(city: string, region: string, country: string) {
  return [city, region, country].filter(Boolean).join(', ');
}

function snippet(text: string | null | undefined, max = 140) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function firstListingImage(images: unknown, media?: { type: string; url: string }[]) {
  const imageMedia = media?.find((m) => m.type === 'IMAGE');
  if (imageMedia?.url) return normalizePublicAssetUrl(imageMedia.url);
  const normalized = normalizeImages(images);
  return normalized[0] ? normalizePublicAssetUrl(normalized[0]) : null;
}

export async function notifyNewProductListing(params: {
  farmerUserId: string;
  farmerName: string;
  listing: {
    id: string;
    title: string;
    price: number;
    unit: string;
    images: unknown;
  };
  media?: { type: string; url: string }[];
}) {
  const { farmerUserId, farmerName, listing, media } = params;
  const imageUrl = firstListingImage(listing.images, media);
  const priceLabel = `GHC ${listing.price.toFixed(2)}/${listing.unit}`;

  const buyers = await prisma.user.findMany({
    where: { roleId: { in: [...MARKETPLACE_BUYER_ROLES] } },
    select: { id: true },
  });

  await Promise.all(
    buyers
      .filter((b) => b.id !== farmerUserId)
      .map(async (buyer) => {
        const accessSet = await buyerFarmAccessSet(buyer.id);
        const hasAccess = accessSet.has(farmerUserId);
        const link = hasAccess ? '/marketplace' : '/access';
        const actionLabel = hasAccess ? 'View product' : 'Access farm';

        await createNotification({
          userId: buyer.id,
          actorId: farmerUserId,
          type: 'NEW_PRODUCT',
          title: listing.title,
          body: `${farmerName} listed ${listing.title} — ${priceLabel}.`,
          link,
          metadata: {
            imageUrl,
            price: listing.price,
            priceLabel,
            farmerUserId,
            listingId: listing.id,
            actionUrl: link,
            actionLabel,
          },
        }).catch(() => undefined);
      })
  );
}

export async function notifyNewFarmerJoined(params: {
  farmerUserId: string;
  farmerName: string;
  farmSize?: string | null;
  city: string;
  region: string;
  country: string;
  commodities: string[];
}) {
  const { farmerUserId, farmerName, farmSize, city, region, country, commodities } = params;
  const location = formatLocation(city, region, country);
  const commodityList = commodities.length ? commodities.join(', ') : 'Not specified';

  const buyers = await prisma.user.findMany({
    where: { roleId: { in: [...MARKETPLACE_BUYER_ROLES] } },
    select: { id: true },
  });

  await Promise.all(
    buyers
      .filter((b) => b.id !== farmerUserId)
      .map(async (buyer) => {
        await createNotification({
          userId: buyer.id,
          actorId: farmerUserId,
          type: 'NEW_FARMER',
          title: `New farmer: ${farmerName}`,
          body: `${farmSize ? `${farmSize} acres · ` : ''}${location}. Commodities: ${commodityList}.`,
          link: '/access',
          metadata: {
            farmerUserId,
            farmerName,
            farmSize: farmSize ?? null,
            location,
            commodities,
            actionUrl: '/access',
            actionLabel: 'Access farm',
          },
        }).catch(() => undefined);
      })
  );
}

export async function notifyNewPublication(params: {
  researcherUserId: string;
  researcherName: string;
  publication: {
    id: string;
    title: string;
    description?: string | null;
    coverImage?: string | null;
  };
}) {
  const { researcherUserId, researcherName, publication } = params;
  const imageUrl = publication.coverImage
    ? normalizePublicAssetUrl(publication.coverImage)
    : null;
  const description = snippet(publication.description);

  await notifyUsersByRoles(
    [...FARMER_ROLES, ROLES.BUYER, ROLES.STUDENT],
    {
      actorId: researcherUserId,
      type: 'NEW_PUBLICATION',
      title: publication.title,
      body: description
        ? `${researcherName} published "${publication.title}" — ${description}`
        : `${researcherName} published "${publication.title}".`,
      link: '/library',
      metadata: {
        imageUrl,
        publicationId: publication.id,
        actionUrl: '/library',
        actionLabel: 'Read',
      },
    },
    researcherUserId
  );
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
  const body = `${buyerName} ordered ${productName} — GHC ${totalAmount.toFixed(2)} held in escrow until buyer confirms delivery. Download the order statement from Buyer Orders.`;
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
  totalAmount: number,
  orderId?: string
) {
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: 'PRODUCT_PURCHASE',
    title: 'Order placed — save your release code',
    body: `You purchased ${productName} from ${farmerName} for GHC ${totalAmount.toFixed(2)}. Check My Orders for your 4-digit release code and financial statement PDF.`,
    link: orderId ? `/orders?order=${orderId}` : '/orders',
  }).catch(() => undefined);
}

export async function notifyOrderPaymentReleased(order: {
  id: string;
  buyerId: string;
  farmerId: string;
  totalAmount: number;
  listing: { title: string };
  buyer: { firstName: string; lastName: string };
  farmer: { firstName: string; lastName: string };
}) {
  const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;
  const farmerName = `${order.farmer.firstName} ${order.farmer.lastName}`;
  const body = `${buyerName} confirmed delivery for ${order.listing.title} — GHC ${order.totalAmount.toFixed(2)} released to ANI Accountant.`;

  const buyerHandlers = await prisma.agentAssignment.findMany({
    where: { ownerId: order.buyerId, relationshipType: 'BUYER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  const farmerHandlers = await prisma.agentAssignment.findMany({
    where: { ownerId: order.farmerId, relationshipType: 'FARMER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  const staff = await prisma.user.findMany({
    where: { roleId: { in: [...STAFF_ROLES] } },
    select: { id: true },
  });

  const userIds = [
    order.buyerId,
    order.farmerId,
    ...buyerHandlers.map((h) => h.agentId),
    ...farmerHandlers.map((h) => h.agentId),
    ...staff.map((s) => s.id),
  ];

  await notifyUsers(userIds, {
    actorId: order.buyerId,
    type: 'ORDER_PAYMENT_RELEASED',
    title: 'Order payment released',
    body,
    link: '/orders',
  });
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
