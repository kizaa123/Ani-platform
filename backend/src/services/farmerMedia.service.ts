import prisma from '../database/prisma';
import { assertFound, assertAuthorized, AppError } from '../utils/errors';
import { isFarmerRole } from '../constants/roles';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { FarmerMediaType } from '@prisma/client';

export const MAX_FARMER_MEDIA = 5;
export const MAX_VIDEO_DURATION_SEC = 60;

function formatMedia(
  media: {
    id: string;
    type: FarmerMediaType;
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

export class FarmerMediaService {
  private async getFarmerProfileByUserId(userId: string) {
    return assertFound(
      await prisma.farmerProfile.findUnique({ where: { userId } }),
      'Farmer profile not found'
    );
  }

  async listOwnMedia(userId: string, roleId: number) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can manage farm media');
    const profile = await this.getFarmerProfileByUserId(userId);
    const items = await prisma.farmerMedia.findMany({
      where: { farmerId: profile.id },
      orderBy: { orderIndex: 'asc' },
    });
    return items.map((m) => formatMedia(m));
  }

  async listByFarmerUserId(farmerUserId: string, viewerUserId?: string) {
    const profile = await this.getFarmerProfileByUserId(farmerUserId);
    const items = await prisma.farmerMedia.findMany({
      where: { farmerId: profile.id },
      orderBy: { orderIndex: 'asc' },
    });

    let likedIds = new Set<string>();
    if (viewerUserId && items.length) {
      const likes = await prisma.farmerMediaLike.findMany({
        where: { buyerId: viewerUserId, mediaId: { in: items.map((i) => i.id) } },
        select: { mediaId: true },
      });
      likedIds = new Set(likes.map((l) => l.mediaId));
    }

    return items.map((m) => formatMedia(m, likedIds.has(m.id)));
  }

  async createMedia(
    userId: string,
    roleId: number,
    data: {
      type: FarmerMediaType;
      url: string;
      duration?: number | null;
    }
  ) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can upload farm media');
    const profile = await this.getFarmerProfileByUserId(userId);

    const count = await prisma.farmerMedia.count({ where: { farmerId: profile.id } });
    if (count >= MAX_FARMER_MEDIA) {
      throw new AppError(400, `Maximum ${MAX_FARMER_MEDIA} media files allowed per farm`);
    }

    if (data.type === 'VIDEO') {
      if (data.duration == null || data.duration <= 0) {
        throw new AppError(400, 'Video duration is required');
      }
      if (data.duration > MAX_VIDEO_DURATION_SEC) {
        throw new AppError(400, `Videos must be ${MAX_VIDEO_DURATION_SEC} seconds or less`);
      }
    }

    const media = await prisma.farmerMedia.create({
      data: {
        farmerId: profile.id,
        type: data.type,
        url: data.url,
        duration: data.type === 'VIDEO' ? data.duration : null,
        orderIndex: count,
      },
    });

    return formatMedia(media);
  }

  async deleteMedia(userId: string, roleId: number, mediaId: string) {
    assertAuthorized(isFarmerRole(roleId), 'Only farmers can delete farm media');
    const profile = await this.getFarmerProfileByUserId(userId);

    const media = assertFound(
      await prisma.farmerMedia.findFirst({
        where: { id: mediaId, farmerId: profile.id },
      }),
      'Media not found'
    );

    await prisma.farmerMedia.delete({ where: { id: media.id } });

    const remaining = await prisma.farmerMedia.findMany({
      where: { farmerId: profile.id },
      orderBy: { orderIndex: 'asc' },
    });
    await Promise.all(
      remaining.map((item, index) =>
        prisma.farmerMedia.update({
          where: { id: item.id },
          data: { orderIndex: index },
        })
      )
    );

    return { message: 'Media deleted' };
  }

  async toggleLike(mediaId: string, buyerId: string) {
    const media = assertFound(
      await prisma.farmerMedia.findUnique({ where: { id: mediaId } }),
      'Media not found'
    );

    const existing = await prisma.farmerMediaLike.findUnique({
      where: { mediaId_buyerId: { mediaId, buyerId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.farmerMediaLike.delete({ where: { id: existing.id } }),
        prisma.farmerMedia.update({
          where: { id: mediaId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      const updated = await prisma.farmerMedia.findUnique({ where: { id: mediaId } });
      return { liked: false, likesCount: updated?.likesCount ?? 0 };
    }

    await prisma.$transaction([
      prisma.farmerMediaLike.create({ data: { mediaId, buyerId } }),
      prisma.farmerMedia.update({
        where: { id: mediaId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    const updated = await prisma.farmerMedia.findUnique({ where: { id: mediaId } });
    return { liked: true, likesCount: updated?.likesCount ?? 0 };
  }

  async recordShare(mediaId: string) {
    const media = assertFound(
      await prisma.farmerMedia.findUnique({ where: { id: mediaId } }),
      'Media not found'
    );

    const updated = await prisma.farmerMedia.update({
      where: { id: media.id },
      data: { sharesCount: { increment: 1 } },
    });

    return { sharesCount: updated.sharesCount };
  }
}

export const farmerMediaService = new FarmerMediaService();
