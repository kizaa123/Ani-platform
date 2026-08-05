import { Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import { assertFound } from '../utils/errors';
import { normalizeImages, normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { buyerFarmAccessSet } from '../middleware/access.middleware';
import { formatVerificationTags, verificationTagSelect } from '../utils/verificationTags';
import {
  formatAmountForCountry,
  formatOrderAmountForRecipient,
  formatPricePerUnit,
} from '../utils/currency';
import {
  FARMER_ROLES,
  MARKETPLACE_BUYER_ROLES,
  ROLES,
  STAFF_ROLES,
  isBuyerHandler,
  isFarmerHandler,
  isFarmerRole,
  isResearcherRole,
  portalDirectoryRoleLabel,
  profileSettingsPath,
} from '../constants/roles';

export type NotificationMetadata = {
  imageUrl?: string | null;
  price?: number | null;
  priceLabel?: string | null;
  quantity?: number | null;
  unit?: string | null;
  farmerId?: string | null;
  farmerUserId?: string | null;
  listingId?: string | null;
  publicationId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  orderName?: string | null;
  farmSize?: string | null;
  location?: string | null;
  commodities?: string[] | null;
  customProducts?: string[] | null;
  farmerName?: string | null;
  orderId?: string | null;
  ownerId?: string | null;
};

export type NotificationTypeValue =
  | 'CHAT_MESSAGE'
  | 'NEW_ORDER'
  | 'ORDER_TRACKED'
  | 'ORDER_PAYMENT_RELEASED'
  | 'MONEY_DISTRIBUTED'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_APPROVED'
  | 'CONNECTION_DECLINED'
  | 'FARM_ACCESS_PAID'
  | 'PRODUCT_PURCHASE'
  | 'RESEARCH_PURCHASE'
  | 'NEW_PRODUCT'
  | 'NEW_FARMER'
  | 'NEW_PUBLICATION'
  | 'HANDLER_DROPPED'
  | 'FARM_PRODUCTS_AVAILABLE'
  | 'NEW_ACCOUNTANT_REGISTRATION'
  | 'ACCOUNTANT_REGISTRATION_SUBMITTED'
  | 'ACCOUNTANT_APPROVED'
  | 'ACCOUNTANT_REJECTED'
  | 'USER_VERIFIED'
  | 'INTERNATIONAL_VERIFICATION';

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

const actorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profilePicture: true,
  verificationStatus: true,
  verificationTags: { select: verificationTagSelect },
} as const;

function formatActor(actor: {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  verificationStatus: string;
  verificationTags?: { id: string; tagType: string; createdAt: Date }[];
}) {
  return {
    id: actor.id,
    firstName: actor.firstName,
    lastName: actor.lastName,
    profilePicture: normalizePublicAssetUrl(actor.profilePicture),
    verificationStatus: actor.verificationStatus,
    verificationTags: formatVerificationTags(actor.verificationTags ?? []),
  };
}

function formatMetadata(metadata: NotificationMetadata | null): NotificationMetadata | null {
  if (!metadata) return null;
  return {
    ...metadata,
    imageUrl: metadata.imageUrl ? normalizePublicAssetUrl(metadata.imageUrl) : metadata.imageUrl,
  };
}

function logNotificationError(type: NotificationTypeValue, err: unknown) {
  console.error(`[notification] Failed to create ${type} notification:`, err);
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
      actor: { select: actorSelect },
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
  const handler = await prisma.agentAssignment.findFirst({
    where: { ownerId: farmerId, relationshipType: 'FARMER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  const userIds = handler ? [farmerId, handler.agentId] : [farmerId];
  await notifyUsers(userIds, input);
}

export class NotificationService {
  async listForUser(userId: string, limit = 50) {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: actorSelect },
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
      actor: n.actor ? formatActor(n.actor) : null,
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

async function financialStatementLink(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roleId: true },
  });
  if (!user) return '/financials';
  if (isFarmerRole(user.roleId)) return '/farm/financials';
  if (isResearcherRole(user.roleId)) return '/researcher/financials';
  if (isFarmerHandler(user.roleId) || isBuyerHandler(user.roleId)) return '/agents/financials';
  return '/financials';
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

function buildOrderNotificationMetadata(params: {
  productName: string;
  totalAmount?: number;
  quantity?: number;
  unit?: string;
  imageUrl?: string | null;
  listingId?: string;
  actionUrl?: string;
  buyerCountry?: string;
  farmerCountry?: string;
  recipientCountry?: string;
}): NotificationMetadata {
  const {
    productName,
    totalAmount,
    quantity,
    unit,
    imageUrl,
    listingId,
    actionUrl,
    buyerCountry = 'Ghana',
    farmerCountry = 'Ghana',
    recipientCountry = farmerCountry,
  } = params;
  const priceLabel =
    totalAmount != null
      ? formatOrderAmountForRecipient(totalAmount, buyerCountry, recipientCountry)
      : null;
  return {
    orderName: productName,
    actionLabel: productName,
    imageUrl: imageUrl ?? null,
    listingId: listingId ?? null,
    quantity: quantity ?? null,
    unit: unit ?? null,
    price: totalAmount ?? null,
    priceLabel,
    actionUrl: actionUrl ?? null,
  };
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

  const buyers = await prisma.user.findMany({
    where: { roleId: { in: [...MARKETPLACE_BUYER_ROLES] } },
    select: { id: true, country: true },
  });

  await Promise.all(
    buyers
      .filter((b) => b.id !== farmerUserId)
      .map(async (buyer) => {
        const accessSet = await buyerFarmAccessSet(buyer.id);
        const hasAccess = accessSet.has(farmerUserId);
        const link = '/marketplace';
        const actionLabel = hasAccess ? 'View product' : 'Pay to access';
        const priceLabel = formatPricePerUnit(listing.price, listing.unit, buyer.country);

        await createNotification({
          userId: buyer.id,
          actorId: farmerUserId,
          type: 'NEW_PRODUCT',
          title: listing.title,
          body: `${farmerName} listed a new product.`,
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
  customProducts?: string[];
}) {
  const { farmerUserId, farmerName, farmSize, city, region, country, commodities, customProducts = [] } = params;
  const location = formatLocation(city, region, country);

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
          title: `New Fellow: ${farmerName}`,
          body: 'Browse their farm and request access.',
          link: '/marketplace',
          metadata: {
            farmerUserId,
            farmerName,
            farmSize: farmSize ?? null,
            location,
            commodities,
            customProducts,
            actionUrl: '/marketplace',
            actionLabel: 'Pay to access',
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
        ? description
        : `${researcherName} published new research.`,
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
    metadata: {
      actionUrl: '/connections',
      actionLabel: 'View message',
    },
  }).catch(() => undefined);
}

export async function notifyNewOrder(
  farmerId: string,
  buyerId: string,
  buyerName: string,
  productName: string,
  totalAmount: number,
  orderDetails?: {
    quantity?: number;
    unit?: string;
    imageUrl?: string | null;
    listingId?: string;
    buyerCountry?: string;
    farmerCountry?: string;
    orderId?: string;
  }
) {
  const buyerCountry = orderDetails?.buyerCountry ?? 'Ghana';
  const farmerCountry = orderDetails?.farmerCountry ?? 'Ghana';
  const farmerAmountLabel = formatOrderAmountForRecipient(
    totalAmount,
    buyerCountry,
    farmerCountry
  );
  const body = `${buyerName} ordered ${productName} - ${farmerAmountLabel} held in escrow until buyer confirms delivery. Download the order statement from Buyer Orders.`;
  const orderMeta = buildOrderNotificationMetadata({
    productName,
    totalAmount,
    quantity: orderDetails?.quantity,
    unit: orderDetails?.unit,
    imageUrl: orderDetails?.imageUrl,
    listingId: orderDetails?.listingId,
    buyerCountry,
    farmerCountry,
    recipientCountry: farmerCountry,
  });

  await createNotification({
    userId: farmerId,
    actorId: buyerId,
    type: 'NEW_ORDER',
    title: 'New buyer order',
    body,
    link: '/farm/orders',
    metadata: { ...orderMeta, actionUrl: '/farm/orders' },
  }).catch(() => undefined);

  const farmerHandler = await prisma.agentAssignment.findFirst({
    where: { ownerId: farmerId, relationshipType: 'FARMER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  if (farmerHandler) {
    const handler = await prisma.user.findUnique({
      where: { id: farmerHandler.agentId },
      select: { country: true },
    });
    const handlerCountry = handler?.country ?? farmerCountry;
    const handlerMeta = buildOrderNotificationMetadata({
      productName,
      totalAmount,
      quantity: orderDetails?.quantity,
      unit: orderDetails?.unit,
      imageUrl: orderDetails?.imageUrl,
      listingId: orderDetails?.listingId,
      buyerCountry,
      farmerCountry,
      recipientCountry: handlerCountry,
    });
    const link = `/agents/farm/${farmerId}/orders`;
    await createNotification({
      userId: farmerHandler.agentId,
      actorId: buyerId,
      type: 'NEW_ORDER',
      title: 'New order for your farmer',
      body,
      link,
      metadata: {
        ...handlerMeta,
        actionUrl: link,
        orderId: orderDetails?.orderId ?? null,
        ownerId: farmerId,
      },
    }).catch(() => undefined);
  }

  const buyerHandler = await prisma.agentAssignment.findFirst({
    where: { ownerId: buyerId, relationshipType: 'BUYER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  if (buyerHandler) {
    const handler = await prisma.user.findUnique({
      where: { id: buyerHandler.agentId },
      select: { country: true },
    });
    const handlerCountry = handler?.country ?? buyerCountry;
    const buyerAmountLabel = formatOrderAmountForRecipient(
      totalAmount,
      buyerCountry,
      handlerCountry
    );
    const handlerMeta = buildOrderNotificationMetadata({
      productName,
      totalAmount,
      quantity: orderDetails?.quantity,
      unit: orderDetails?.unit,
      imageUrl: orderDetails?.imageUrl,
      listingId: orderDetails?.listingId,
      buyerCountry,
      farmerCountry,
      recipientCountry: handlerCountry,
    });
    const link = `/agents/buyer/${buyerId}/orders`;
    await createNotification({
      userId: buyerHandler.agentId,
      actorId: buyerId,
      type: 'NEW_ORDER',
      title: 'New order from your client',
      body: `Your client ${buyerName} ordered ${productName} - ${buyerAmountLabel} held in escrow until buyer confirms delivery.`,
      link,
      metadata: {
        ...handlerMeta,
        actionUrl: link,
        orderId: orderDetails?.orderId ?? null,
        ownerId: buyerId,
      },
    }).catch(() => undefined);
  }
}

export async function notifyProductPurchase(
  buyerId: string,
  farmerId: string,
  farmerName: string,
  productName: string,
  totalAmount: number,
  orderId?: string,
  buyerCountry?: string
) {
  const country = buyerCountry ?? 'Ghana';
  const amountLabel = formatAmountForCountry(totalAmount, country);
  const link = orderId ? `/orders?order=${orderId}` : '/orders';
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: 'PRODUCT_PURCHASE',
    title: 'Order placed - save your release code',
    body: `You purchased ${productName} from ${farmerName} for ${amountLabel}. Check My Orders for your 4-digit release code and financial statement PDF.`,
    link,
    metadata: {
      actionUrl: link,
      actionLabel: 'View order',
      orderName: productName,
      price: totalAmount,
      priceLabel: amountLabel,
    },
  }).catch(() => undefined);
}

export async function notifyOrderPaymentReleased(order: {
  id: string;
  buyerId: string;
  farmerId: string;
  totalAmount: number;
  quantity?: number;
  unit?: string;
  listing: {
    id?: string;
    title: string;
    images?: unknown;
    media?: { type: string; url: string }[];
  };
  buyer: { firstName: string; lastName: string; country?: string };
  farmer: { firstName: string; lastName: string; country?: string };
}) {
  const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`;
  const orderName = order.listing.title;
  const buyerCountry = order.buyer.country ?? 'Ghana';
  const farmerCountry = order.farmer.country ?? 'Ghana';
  const imageUrl = firstListingImage(order.listing.images, order.listing.media);
  const listingId = order.listing.id;

  const notifyReleased = async (
    userId: string,
    link: string,
    ownerId?: string | null
  ) => {
    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    });
    const recipientCountry = recipient?.country ?? farmerCountry;
    const amountLabel = formatOrderAmountForRecipient(
      order.totalAmount,
      buyerCountry,
      recipientCountry
    );
    const body = `${buyerName} confirmed delivery for "${orderName}" - ${amountLabel} released to ANI Accountant.`;
    const orderMeta = buildOrderNotificationMetadata({
      productName: orderName,
      totalAmount: order.totalAmount,
      quantity: order.quantity,
      unit: order.unit,
      imageUrl,
      listingId,
      buyerCountry,
      farmerCountry,
      recipientCountry,
    });
    await createNotification({
      actorId: order.buyerId,
      type: 'ORDER_PAYMENT_RELEASED',
      title: 'Order payment released',
      body,
      userId,
      link,
      metadata: {
        ...orderMeta,
        actionUrl: link,
        orderId: order.id,
        ownerId: ownerId ?? null,
      },
    }).catch(() => undefined);
  };

  const buyerHandlers = await prisma.agentAssignment.findMany({
    where: { ownerId: order.buyerId, relationshipType: 'BUYER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  const farmerHandlers = await prisma.agentAssignment.findMany({
    where: { ownerId: order.farmerId, relationshipType: 'FARMER_REPRESENTATIVE' },
    select: { agentId: true },
  });
  const staff = await prisma.user.findMany({
    where: {
      roleId: ROLES.ANI_ACCOUNTANT,
      isActive: true,
      verificationStatus: 'VERIFIED',
    },
    select: { id: true },
  });

  await notifyReleased(order.buyerId, '/orders');
  await notifyReleased(order.farmerId, '/farm/orders');
  for (const handler of farmerHandlers) {
    await notifyReleased(handler.agentId, `/agents/farm/${order.farmerId}/orders`, order.farmerId);
  }
  for (const handler of buyerHandlers) {
    await notifyReleased(handler.agentId, `/agents/buyer/${order.buyerId}/orders`, order.buyerId);
  }
  for (const accountant of staff) {
    await notifyReleased(accountant.id, '/accountant/receipts');
  }
}

export async function notifyOrderTracked(
  buyerId: string,
  farmerId: string,
  farmerName: string,
  productName: string,
  stageLabel: string,
  orderDetails?: {
    totalAmount?: number;
    quantity?: number;
    unit?: string;
    imageUrl?: string | null;
    listingId?: string;
    buyerCountry?: string;
    farmerCountry?: string;
    orderId?: string;
  }
) {
  const buyerCountry = orderDetails?.buyerCountry ?? 'Ghana';
  const farmerCountry = orderDetails?.farmerCountry ?? 'Ghana';
  const body = `${farmerName} updated your order for ${productName} - now at "${stageLabel}".`;
  const orderMeta = buildOrderNotificationMetadata({
    productName,
    totalAmount: orderDetails?.totalAmount,
    quantity: orderDetails?.quantity,
    unit: orderDetails?.unit,
    imageUrl: orderDetails?.imageUrl,
    listingId: orderDetails?.listingId,
    buyerCountry,
    farmerCountry,
    recipientCountry: buyerCountry,
  });
  const baseInput = {
    actorId: farmerId,
    type: 'ORDER_TRACKED' as const,
    title: 'Order update',
    body,
    metadata: orderMeta,
  };

  await createNotification({
    ...baseInput,
    userId: buyerId,
    link: '/orders',
    metadata: { ...baseInput.metadata, actionUrl: '/orders' },
  }).catch(() => undefined);

  const [farmerHandler, buyerHandler] = await Promise.all([
    prisma.agentAssignment.findFirst({
      where: { ownerId: farmerId, relationshipType: 'FARMER_REPRESENTATIVE' },
      select: { agentId: true },
    }),
    prisma.agentAssignment.findFirst({
      where: { ownerId: buyerId, relationshipType: 'BUYER_REPRESENTATIVE' },
      select: { agentId: true },
    }),
  ]);

  if (farmerHandler) {
    const link = `/agents/farm/${farmerId}/orders`;
    await createNotification({
      ...baseInput,
      userId: farmerHandler.agentId,
      title: 'Order update for your farmer',
      link,
      metadata: {
        ...baseInput.metadata,
        actionUrl: link,
        orderId: orderDetails?.orderId ?? null,
        ownerId: farmerId,
      },
    }).catch(() => undefined);
  }

  if (buyerHandler) {
    const link = `/agents/buyer/${buyerId}/orders`;
    await createNotification({
      ...baseInput,
      userId: buyerHandler.agentId,
      title: 'Order update for your client',
      link,
      metadata: {
        ...baseInput.metadata,
        actionUrl: link,
        orderId: orderDetails?.orderId ?? null,
        ownerId: buyerId,
      },
    }).catch(() => undefined);
  }
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
    body: `${buyerName} requested access to your farm. ANI admin will review the request - no action needed from you.`,
    link: '/connections',
    metadata: {
      actionUrl: '/connections',
      actionLabel: 'View request',
    },
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
      link: '/connections',
      metadata: {
        actionUrl: '/connections',
        actionLabel: 'Review request',
      },
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
    link: '/marketplace',
    metadata: {
      farmerUserId: farmerId,
      farmerName,
      actionUrl: '/marketplace',
      actionLabel: 'Browse farm',
    },
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
    link: '/marketplace',
    metadata: {
      farmerUserId: farmerId,
      farmerName,
      actionUrl: '/marketplace',
      actionLabel: 'Browse farms',
    },
  }).catch(() => undefined);
}

export async function notifyFarmAccessPaid(
  buyerId: string,
  farmerId: string,
  buyerName: string,
  farmerName: string,
  amount: number,
  autoApproved = false,
  buyerCountry?: string
) {
  const country = buyerCountry ?? 'Ghana';
  const amountLabel = formatAmountForCountry(amount, country);
  const statementLink = await financialStatementLink(buyerId);
  const link = autoApproved ? '/marketplace' : statementLink;
  await createNotification({
    userId: buyerId,
    actorId: farmerId,
    type: autoApproved ? 'CONNECTION_APPROVED' : 'FARM_ACCESS_PAID',
    title: autoApproved ? 'Farm access granted' : 'Farm access payment',
    body: autoApproved
      ? `You paid ${amountLabel} for access to ${farmerName}. You can now browse products and place orders.`
      : `You paid ${amountLabel} for access to ${farmerName}. Recorded on your financial statement - access will activate once payment is confirmed.`,
    link,
    metadata: {
      farmerUserId: farmerId,
      farmerName,
      price: amount,
      priceLabel: amountLabel,
      actionUrl: link,
      actionLabel: autoApproved ? 'Browse farm' : 'View statement',
    },
  }).catch(() => undefined);

  if (autoApproved) {
    await notifyFarmerTeam(farmerId, {
      actorId: buyerId,
      type: 'FARM_ACCESS_PAID',
      title: 'New farm access client',
      body: `${buyerName} paid the access fee and can now view your farm and products.`,
      link: '/connections',
      metadata: {
        actionUrl: '/connections',
        actionLabel: 'View connections',
      },
    });
    return;
  }

  await notifyConnectionRequest(farmerId, buyerId, buyerName);
  await notifyAdminsConnectionRequest(buyerId, buyerName, farmerId, farmerName);
}

export async function notifyResearchPurchase(
  researcherId: string,
  studentId: string,
  studentName: string,
  publicationTitle: string,
  grossAmount: number,
  researcherShare: number
) {
  await createNotification({
    userId: researcherId,
    actorId: studentId,
    type: 'RESEARCH_PURCHASE',
    title: 'Publication purchased',
    body: `${studentName} paid GHC ${grossAmount.toFixed(2)} for "${publicationTitle}". Your share (90%): GHC ${researcherShare.toFixed(2)}.`,
    link: '/researcher/financials',
    metadata: {
      actionUrl: '/researcher/financials',
      actionLabel: 'View earnings',
    },
  }).catch(() => undefined);

  await createNotification({
    userId: studentId,
    actorId: researcherId,
    type: 'RESEARCH_PURCHASE',
    title: 'Access granted',
    body: `You now have access to "${publicationTitle}".`,
    link: '/library',
    metadata: {
      actionUrl: '/library',
      actionLabel: 'Read publication',
    },
  }).catch(() => undefined);
}

export async function notifyMoneyDistributed(
  recipientId: string,
  recipientFirstName: string,
  amount: number,
  buyerName: string,
  orderName: string,
  orderDetails?: {
    quantity?: number;
    unit?: string;
    imageUrl?: string | null;
    listingId?: string;
    totalAmount?: number;
    buyerCountry?: string;
    farmerCountry?: string;
    orderId?: string;
    ownerId?: string;
  }
) {
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { roleId: true, country: true },
  });
  const buyerCountry = orderDetails?.buyerCountry ?? 'Ghana';
  const farmerCountry = orderDetails?.farmerCountry ?? 'Ghana';
  const recipientCountry = recipient?.country ?? farmerCountry;
  const formatted = formatOrderAmountForRecipient(amount, buyerCountry, recipientCountry);
  const link = recipient
    ? isFarmerRole(recipient.roleId)
      ? '/farm/financials'
      : isFarmerHandler(recipient.roleId) || isBuyerHandler(recipient.roleId)
        ? '/agents/financials'
        : '/financials'
    : '/financials';

  const orderMeta = buildOrderNotificationMetadata({
    productName: orderName,
    totalAmount: orderDetails?.totalAmount ?? amount,
    quantity: orderDetails?.quantity,
    unit: orderDetails?.unit,
    imageUrl: orderDetails?.imageUrl,
    listingId: orderDetails?.listingId,
    actionUrl: link,
    buyerCountry,
    farmerCountry,
    recipientCountry,
  });

  await createNotification({
    userId: recipientId,
    type: 'MONEY_DISTRIBUTED',
    title: 'Payment received from ANI',
    body: `Dear ${recipientFirstName}, you have received ${formatted} from ANI for the successful delivery of "${orderName}" (${buyerName} order).`,
    link,
    metadata: {
      ...orderMeta,
      price: amount,
      priceLabel: formatted,
      orderId: orderDetails?.orderId ?? null,
      ownerId: orderDetails?.ownerId ?? null,
    },
  }).catch(() => undefined);
}

export async function notifyHandlerDropped(
  handlerId: string,
  ownerName: string,
  relationshipType: 'FARMER_REPRESENTATIVE' | 'BUYER_REPRESENTATIVE'
) {
  const isFarmerClient = relationshipType === 'FARMER_REPRESENTATIVE';
  await createNotification({
    userId: handlerId,
    type: 'HANDLER_DROPPED',
    title: isFarmerClient ? 'Farmer changed liaison officer' : 'Client changed liaison officer',
    body: `${ownerName} has assigned a different liaison officer and is no longer your assigned ${isFarmerClient ? 'farmer' : 'client'}.`,
    link: '/agents',
    metadata: {
      actionLabel: 'View clients',
      actionUrl: '/agents',
    },
  }).catch(() => undefined);
}

export async function notifyFarmProductsAvailable(params: {
  farmerUserId: string;
  clientId: string;
  customMessage?: string;
}) {
  const { farmerUserId, clientId, customMessage } = params;
  const farmer = await prisma.user.findUnique({
    where: { id: farmerUserId },
    select: {
      firstName: true,
      lastName: true,
      farmerProfile: { select: { farmName: true } },
    },
  });
  if (!farmer) return;

  const farmerName = formatName(farmer.firstName, farmer.lastName);
  const farmName = farmer.farmerProfile?.farmName?.trim() || farmerName;
  const defaultMessage = 'Farm products are available, please access my farm';
  const body = customMessage?.trim() || defaultMessage;
  const link = '/marketplace';

  const accessSet = await buyerFarmAccessSet(clientId);
  const hasAccess = accessSet.has(farmerUserId);
  const actionLabel = hasAccess ? 'View farm' : 'Access farm';

  await createNotification({
    userId: clientId,
    actorId: farmerUserId,
    type: 'FARM_PRODUCTS_AVAILABLE',
    title: `${farmName} - products available`,
    body,
    link,
    metadata: {
      farmerUserId,
      farmerName,
      actionUrl: link,
      actionLabel,
    },
  }).catch(() => undefined);
}

export async function notifyHandlerFarmProductsAvailable(params: {
  handlerUserId: string;
  clientId: string;
  customMessage?: string;
}) {
  const { handlerUserId, clientId, customMessage } = params;
  const handler = await prisma.user.findUnique({
    where: { id: handlerUserId },
    select: { firstName: true, lastName: true },
  });
  if (!handler) return;

  const handlerName = formatName(handler.firstName, handler.lastName);
  const defaultMessage = 'Farm products are available, please access my farm';
  const body = customMessage?.trim() || defaultMessage;
  const link = '/marketplace';

  await createNotification({
    userId: clientId,
    actorId: handlerUserId,
    type: 'FARM_PRODUCTS_AVAILABLE',
    title: `${handlerName} - farm products available`,
    body,
    link,
    metadata: {
      actionUrl: link,
      actionLabel: 'Browse marketplace',
    },
  }).catch(() => undefined);
}

export async function notifyResearchPublicationsAvailable(params: {
  researcherUserId: string;
  clientId: string;
  customMessage?: string;
}) {
  const { researcherUserId, clientId, customMessage } = params;
  const researcher = await prisma.user.findUnique({
    where: { id: researcherUserId },
    select: {
      firstName: true,
      lastName: true,
      researcherProfile: { select: { institution: true } },
    },
  });
  if (!researcher) return;

  const researcherName = formatName(researcher.firstName, researcher.lastName);
  const displayName = researcher.researcherProfile?.institution?.trim() || researcherName;
  const defaultMessage = 'Research publications are available, please visit my library';
  const body = customMessage?.trim() || defaultMessage;
  const link = `/library/publisher/${researcherUserId}`;

  const purchase = await prisma.researchPurchase.findFirst({
    where: {
      studentId: clientId,
      researcherId: researcherUserId,
      status: 'COMPLETED',
    },
    select: { id: true },
  });
  const actionLabel = purchase ? 'View publications' : 'Browse library';

  await createNotification({
    userId: clientId,
    actorId: researcherUserId,
    type: 'NEW_PUBLICATION',
    title: `${displayName} - publications available`,
    body,
    link,
    metadata: {
      actionUrl: link,
      actionLabel,
    },
  }).catch(() => undefined);
}

export async function getUserDisplayName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  return user ? formatName(user.firstName, user.lastName) : 'Someone';
}

function verifiedAccountClosing(roleId: number): string {
  if (isResearcherRole(roleId)) {
    return 'We look forward to your continued contributions and your good publishes on the platform.';
  }
  return 'We look forward to your continued contributions and quality products on the platform.';
}

function internationalVerificationClosing(roleId: number): string {
  if (isResearcherRole(roleId)) {
    return 'We look forward to your continued contributions and your good publishes on the platform.';
  }
  if (isFarmerRole(roleId)) {
    return 'We look forward to your continued quality production on the platform.';
  }
  if (isFarmerHandler(roleId) || isBuyerHandler(roleId)) {
    return 'We look forward to your continued support for fellows and clients on the platform.';
  }
  return 'We look forward to your continued contributions and quality products on the platform.';
}

export async function notifyUserVerified(params: {
  userId: string;
  firstName: string;
  roleId: number;
}) {
  const roleLabel = portalDirectoryRoleLabel(params.roleId);
  const link = profileSettingsPath(params.roleId);

  await createNotification({
    userId: params.userId,
    type: 'USER_VERIFIED',
    title: 'Account verified',
    body: `Congratulations ${params.firstName}, you have been verified as a ${roleLabel} on the ANI platform. ${verifiedAccountClosing(params.roleId)}`,
    link,
    metadata: {
      actionUrl: link,
      actionLabel: 'View profile',
    },
  }).catch((err) => logNotificationError('USER_VERIFIED', err));
}

export async function notifyInternationalVerification(params: {
  userId: string;
  firstName: string;
  roleId: number;
  tagType:
    | 'INTERNATIONAL_FARMER'
    | 'INTERNATIONAL_BUYER'
    | 'INTERNATIONAL_FARMER_HANDLER'
    | 'INTERNATIONAL_BUYER_HANDLER';
}) {
  const link = profileSettingsPath(params.roleId);
  const intlRoleLabel =
    params.tagType === 'INTERNATIONAL_BUYER'
      ? 'Client'
      : portalDirectoryRoleLabel(params.roleId);

  await createNotification({
    userId: params.userId,
    type: 'INTERNATIONAL_VERIFICATION',
    title: 'International verification granted',
    body: `Hello ${params.firstName}, congratulations! You have been verified for international ${intlRoleLabel} status and may serve clients outside your country. ${internationalVerificationClosing(params.roleId)}`,
    link,
    metadata: {
      actionUrl: link,
      actionLabel: 'View profile',
    },
  }).catch((err) => logNotificationError('INTERNATIONAL_VERIFICATION', err));
}

export async function notifyAdminsPendingAccountant(params: {
  accountantUserId: string;
  accountantName: string;
  email: string;
}) {
  const admins = await prisma.user.findMany({
    where: { roleId: ROLES.ADMIN, isActive: true },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        actorId: params.accountantUserId,
        type: 'NEW_ACCOUNTANT_REGISTRATION',
        title: 'New ANI Accountant registration',
        body: `${params.accountantName} (${params.email}) registered as ANI Accountant and is awaiting approval on ANI Team.`,
        link: '/admin/staff',
        metadata: {
          actionUrl: '/admin/staff',
          actionLabel: 'Review registration',
        },
      }).catch(() => undefined)
    )
  );
}

export async function notifyAccountantRegistrationSubmitted(params: {
  userId: string;
  firstName: string;
}) {
  await createNotification({
    userId: params.userId,
    type: 'ACCOUNTANT_REGISTRATION_SUBMITTED',
    title: 'Registration submitted',
    body: `Hello ${params.firstName}, your ANI Accountant registration was received. A platform administrator will review your account before you can access the financial portal.`,
    link: '/dashboard',
    metadata: {
      actionUrl: '/dashboard',
      actionLabel: 'View dashboard',
    },
  }).catch((err) => logNotificationError('ACCOUNTANT_REGISTRATION_SUBMITTED', err));
}

export async function notifyAccountantApproved(params: { userId: string; firstName: string }) {
  await createNotification({
    userId: params.userId,
    type: 'ACCOUNTANT_APPROVED',
    title: 'ANI Accountant account approved',
    body: `Congratulations ${params.firstName}, your ANI Accountant registration has been approved. You can now access the financial portal.`,
    link: '/accountant',
    metadata: {
      actionUrl: '/accountant',
      actionLabel: 'Open financial portal',
    },
  }).catch((err) => logNotificationError('ACCOUNTANT_APPROVED', err));
}

export async function notifyAccountantRejected(params: { userId: string; firstName: string }) {
  await createNotification({
    userId: params.userId,
    type: 'ACCOUNTANT_REJECTED',
    title: 'ANI Accountant registration declined',
    body: `Hello ${params.firstName}, your ANI Accountant registration was not approved. Contact a platform administrator if you believe this was a mistake.`,
    link: '/profile',
    metadata: {
      actionUrl: '/profile',
      actionLabel: 'View profile',
    },
  }).catch((err) => logNotificationError('ACCOUNTANT_REJECTED', err));
}
