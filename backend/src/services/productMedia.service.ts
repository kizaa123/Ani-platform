import prisma from '../database/prisma';
import { assertFound, assertAuthorized, AppError } from '../utils/errors';
import { isFarmerRole, getFullName } from '../constants/roles';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { ProductMediaType } from '@prisma/client';
import { notifyProductLiked } from './notification.service';

export const MAX_PRODUCT_MEDIA = 5;
export const MAX_VIDEO_DURATION_SEC = 60;

function formatMedia(
  media: {
    id: string;
    type: ProductMediaType;
    url: string;
    duration: number | null;
    orderIndex: number;
    likesCount: number;
    sharesCount: number;
    createdAt: Date;
  },
  likedByMe = false
) {
  return {
    id: media.id,
    type: media.type,
    url: normalizePublicAssetUrl(media.url) ?? media.url,
    duration: media.duration,
    orderIndex: media.orderIndex,
    likesCount: media.likesCount,
    sharesCount: media.sharesCount,
    likedByMe,
    createdAt: media.createdAt.toISOString(),
  };
}

export class ProductMediaService {
  private async getFarmerProfileByUserId(userId: string) {
    return assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
  }

  private async assertListingOwner(userId: string, roleId: number, listingId: string) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can manage product media');
    const profile = await this.getFarmerProfileByUserId(userId);
    const listing = assertFound(
      await prisma.commodityListing.findFirst({
        where: { id: listingId, farmerId: profile.id },
      }),
      'Listing not found or not owned by you'
    );
    return listing;
  }

  async listByListing(listingId: string, viewerUserId?: string) {
    const items = await prisma.productMedia.findMany({
      where: { listingId },
      orderBy: { orderIndex: 'asc' },
    });

    let likedIds = new Set<string>();
    if (viewerUserId && items.length) {
      const likes = await prisma.productMediaLike.findMany({
        where: { buyerId: viewerUserId, mediaId: { in: items.map((i) => i.id) } },
        select: { mediaId: true },
      });
      likedIds = new Set(likes.map((l) => l.mediaId));
    }

    return items.map((m) => formatMedia(m, likedIds.has(m.id)));
  }

  async listForListings(listingIds: string[], viewerUserId?: string) {
    if (!listingIds.length) return new Map<string, ReturnType<typeof formatMedia>[]>();

    const items = await prisma.productMedia.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: { orderIndex: 'asc' },
    });

    let likedIds = new Set<string>();
    if (viewerUserId && items.length) {
      const likes = await prisma.productMediaLike.findMany({
        where: { buyerId: viewerUserId, mediaId: { in: items.map((i) => i.id) } },
        select: { mediaId: true },
      });
      likedIds = new Set(likes.map((l) => l.mediaId));
    }

    const map = new Map<string, ReturnType<typeof formatMedia>[]>();
    for (const item of items) {
      const formatted = formatMedia(item, likedIds.has(item.id));
      const existing = map.get(item.listingId) ?? [];
      existing.push(formatted);
      map.set(item.listingId, existing);
    }
    return map;
  }

  async createMedia(
    userId: string,
    roleId: number,
    listingId: string,
    data: {
      type: ProductMediaType;
      url: string;
      duration?: number | null;
    }
  ) {
    await this.assertListingOwner(userId, roleId, listingId);

    const count = await prisma.productMedia.count({ where: { listingId } });
    if (count >= MAX_PRODUCT_MEDIA) {
      throw new AppError(400, `Maximum ${MAX_PRODUCT_MEDIA} media files allowed per product`);
    }

    if (data.type === 'VIDEO') {
      if (data.duration == null || data.duration <= 0) {
        throw new AppError(400, 'Video duration is required');
      }
      if (data.duration > MAX_VIDEO_DURATION_SEC) {
        throw new AppError(400, `Videos must be ${MAX_VIDEO_DURATION_SEC} seconds or less`);
      }
    }

    const media = await prisma.productMedia.create({
      data: {
        listingId,
        type: data.type,
        url: data.url,
        duration: data.type === 'VIDEO' ? data.duration : null,
        orderIndex: count,
      },
    });

    return formatMedia(media);
  }

  async deleteMedia(userId: string, roleId: number, listingId: string, mediaId: string) {
    await this.assertListingOwner(userId, roleId, listingId);

    const media = assertFound(
      await prisma.productMedia.findFirst({
        where: { id: mediaId, listingId },
      }),
      'Media not found'
    );

    await prisma.productMedia.delete({ where: { id: media.id } });

    const remaining = await prisma.productMedia.findMany({
      where: { listingId },
      orderBy: { orderIndex: 'asc' },
    });
    await Promise.all(
      remaining.map((item, index) =>
        prisma.productMedia.update({
          where: { id: item.id },
          data: { orderIndex: index },
        })
      )
    );

    return { message: 'Media deleted' };
  }

  async toggleLike(mediaId: string, buyerId: string) {
    const media = assertFound(
      await prisma.productMedia.findUnique({
        where: { id: mediaId },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              images: true,
              farmer: { select: { userId: true } },
            },
          },
        },
      }),
      'Media not found'
    );

    const existing = await prisma.productMediaLike.findUnique({
      where: { mediaId_buyerId: { mediaId, buyerId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.productMediaLike.delete({ where: { id: existing.id } }),
        prisma.productMedia.update({
          where: { id: mediaId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      const updated = await prisma.productMedia.findUnique({ where: { id: mediaId } });
      return { liked: false, likesCount: updated?.likesCount ?? 0 };
    }

    await prisma.$transaction([
      prisma.productMediaLike.create({ data: { mediaId, buyerId } }),
      prisma.productMedia.update({
        where: { id: mediaId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    const updated = await prisma.productMedia.findUnique({ where: { id: mediaId } });

    const actor = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { firstName: true, lastName: true },
    });
    if (actor) {
      const listingImages = Array.isArray(media.listing.images)
        ? (media.listing.images as string[])
        : [];
      await notifyProductLiked({
        farmerUserId: media.listing.farmer.userId,
        actorId: buyerId,
        actorName: getFullName(actor.firstName, actor.lastName),
        productTitle: media.listing.title,
        listingId: media.listing.id,
        imageUrl: media.url || listingImages[0] || null,
      });
    }

    return { liked: true, likesCount: updated?.likesCount ?? 0 };
  }

  async recordShare(mediaId: string) {
    const media = assertFound(
      await prisma.productMedia.findUnique({ where: { id: mediaId } }),
      'Media not found'
    );

    const updated = await prisma.productMedia.update({
      where: { id: media.id },
      data: { sharesCount: { increment: 1 } },
    });

    return { sharesCount: updated.sharesCount };
  }
}

export const productMediaService = new ProductMediaService();
