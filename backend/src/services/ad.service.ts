import { z } from 'zod';
import { AdPlacement, Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';

export const AD_PLACEMENTS = ['marketplace', 'library', 'dashboard', 'global'] as const;
export type AdPlacementKey = (typeof AD_PLACEMENTS)[number];

const placementSchema = z.enum(AD_PLACEMENTS);

const imageUrlSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith('/') || /^https?:\/\//i.test(v),
      { message: 'Image must be a valid URL or /uploads path' }
    )
);

const optionalUrlSchema = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z
    .string()
    .refine(
      (v) => v.startsWith('/') || /^https?:\/\//i.test(v),
      { message: 'Must be a valid URL or path' }
    )
    .optional()
);

const targetRoleIdsSchema = z
  .array(z.coerce.number().int().positive())
  .default([]);

export const createAdSchema = z.object({
  title: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1).max(120)
  ),
  description: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().max(500).optional()
    )
    .optional(),
  imageUrl: imageUrlSchema,
  linkUrl: optionalUrlSchema.optional(),
  ctaLabel: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.string().max(40).optional()
    )
    .optional(),
  placement: placementSchema,
  targetRoleIds: targetRoleIdsSchema.optional(),
  active: z.boolean().optional(),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  startsAt: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date().optional()
    )
    .optional(),
  endsAt: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date().optional()
    )
    .optional(),
});

export const updateAdSchema = createAdSchema
  .partial()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field is required',
  });

function toDbPlacement(placement: AdPlacementKey): AdPlacement {
  return placement.toUpperCase() as AdPlacement;
}

function fromDbPlacement(placement: AdPlacement): AdPlacementKey {
  return placement.toLowerCase() as AdPlacementKey;
}

function parseTargetRoleIds(value: Prisma.JsonValue): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === 'number');
}

function formatAd(ad: {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
  ctaLabel: string | null;
  placement: AdPlacement;
  targetRoleIds: Prisma.JsonValue;
  active: boolean;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl,
    ctaLabel: ad.ctaLabel,
    placement: fromDbPlacement(ad.placement),
    targetRoleIds: parseTargetRoleIds(ad.targetRoleIds),
    active: ad.active,
    priority: ad.priority,
    startsAt: ad.startsAt?.toISOString() ?? null,
    endsAt: ad.endsAt?.toISOString() ?? null,
    createdAt: ad.createdAt.toISOString(),
    updatedAt: ad.updatedAt.toISOString(),
  };
}

function scheduleWhere(now: Date): Prisma.AdWhereInput {
  return {
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

export class AdService {
  async listActiveForUser(placement: AdPlacementKey, roleId: number) {
    const now = new Date();
    const ads = await prisma.ad.findMany({
      where: {
        active: true,
        placement: toDbPlacement(placement),
        ...scheduleWhere(now),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return ads
      .filter((ad) => {
        const roles = parseTargetRoleIds(ad.targetRoleIds);
        return roles.length === 0 || roles.includes(roleId);
      })
      .map(formatAd);
  }

  async listAll() {
    const ads = await prisma.ad.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return ads.map(formatAd);
  }

  async getById(id: string) {
    const ad = assertFound(
      await prisma.ad.findUnique({ where: { id } }),
      'Ad not found'
    );
    return formatAd(ad);
  }

  async create(input: z.infer<typeof createAdSchema>) {
    if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
      throw new AppError(400, 'Start date must be before end date');
    }

    const ad = await prisma.ad.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl ?? null,
        ctaLabel: input.ctaLabel ?? null,
        placement: toDbPlacement(input.placement),
        targetRoleIds: input.targetRoleIds ?? [],
        active: input.active ?? true,
        priority: input.priority ?? 0,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
    });
    return formatAd(ad);
  }

  async update(id: string, input: z.infer<typeof updateAdSchema>) {
    const existing = assertFound(
      await prisma.ad.findUnique({ where: { id } }),
      'Ad not found'
    );

    const startsAt = input.startsAt !== undefined ? input.startsAt ?? null : existing.startsAt;
    const endsAt = input.endsAt !== undefined ? input.endsAt ?? null : existing.endsAt;
    if (startsAt && endsAt && startsAt > endsAt) {
      throw new AppError(400, 'Start date must be before end date');
    }

    const ad = await prisma.ad.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description ?? null }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.linkUrl !== undefined && { linkUrl: input.linkUrl ?? null }),
        ...(input.ctaLabel !== undefined && { ctaLabel: input.ctaLabel ?? null }),
        ...(input.placement !== undefined && { placement: toDbPlacement(input.placement) }),
        ...(input.targetRoleIds !== undefined && { targetRoleIds: input.targetRoleIds }),
        ...(input.active !== undefined && { active: input.active }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.startsAt !== undefined && { startsAt: input.startsAt ?? null }),
        ...(input.endsAt !== undefined && { endsAt: input.endsAt ?? null }),
      },
    });
    return formatAd(ad);
  }

  async remove(id: string) {
    assertFound(await prisma.ad.findUnique({ where: { id } }), 'Ad not found');
    await prisma.ad.delete({ where: { id } });
    return { deleted: true };
  }
}

export const adService = new AdService();
