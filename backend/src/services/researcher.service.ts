import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import {
  ROLES,
  isResearcherRole,
  PORTAL_DIRECTORY_ROLES,
  canPurchasePublication,
  getFullName,
} from '../constants/roles';
import { listPortalDirectoryClients } from './farm.service';
import { getPaymentProvider } from './payment.provider';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { formatVerificationTags, verificationTagSelect } from '../utils/verificationTags';
import {
  notifyResearchPurchase,
  notifyNewPublication,
  notifyResearchPublicationsAvailable,
  notifyPublicationLiked,
  notifyPublicationCommented,
} from './notification.service';
import { resolvePublicationDocument } from './storage.service';
import {
  publicationPlatformShareAmount,
  publicationResearcherShareAmount,
} from '../utils/distributionFinancials';
import { normalizeQualifications } from '../constants/qualifications';

export const publicationSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  fileUrl: z.string().min(1),
  coverImage: z.string().optional(),
  category: z.enum(['CROP_FARM', 'LIVESTOCK_FARM', 'OTHER']),
  price: z.coerce.number().min(0).optional(),
  isFree: z.boolean().optional(),
});

export const updatePublicationSchema = publicationSchema.partial();

export const purchasePublicationSchema = z.object({
  paymentMethod: z.string().min(2),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const notifyClientSchema = z.object({
  clientId: z.string().uuid(),
  message: z.string().min(1).max(500).optional(),
});

export const updateResearcherProfileSchema = z.object({
  institution: z.string().optional(),
  expertise: z.string().optional(),
  bio: z.string().optional(),
  qualifications: z.array(z.string()).optional(),
});

const publicationInclude = {
  researcher: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          verificationStatus: true,
          verificationTags: { select: { id: true, tagType: true, createdAt: true } },
        },
      },
    },
  },
} as const;

function publicationIsFreeAccess(pub: { isFree: boolean; price?: number | null }) {
  return pub.isFree || pub.price == null || pub.price <= 0;
}

function formatPublication(
  pub: {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    coverImage: string | null;
    category: string;
    price: number | null;
    isFree: boolean;
    viewCount: number;
    likesCount: number;
    sharesCount: number;
    status: string;
    createdAt: Date;
    researcher: {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        profilePicture: string | null;
        verificationStatus: string;
        verificationTags: { id: string; tagType: string; createdAt: Date }[];
      };
    };
  },
  options: { includeFile?: boolean; hasAccess?: boolean; isOwner?: boolean; likedByMe?: boolean; commentsCount?: number } = {}
) {
  const canAccess = options.isOwner || pub.isFree || !!options.hasAccess;
  const exposeFileUrl =
    canAccess &&
    options.includeFile !== false &&
    (options.isOwner || pub.isFree || !!options.hasAccess);
  return {
    id: pub.id,
    title: pub.title,
    description: pub.description,
    fileUrl: exposeFileUrl ? normalizePublicAssetUrl(pub.fileUrl) : null,
    coverImage: normalizePublicAssetUrl(pub.coverImage),
    category: pub.category,
    price: pub.price,
    isFree: pub.isFree,
    viewCount: pub.viewCount,
    likesCount: pub.likesCount,
    sharesCount: pub.sharesCount,
    likedByMe: options.likedByMe ?? false,
    commentsCount: options.commentsCount,
    status: pub.status,
    createdAt: pub.createdAt.toISOString(),
    hasAccess: !!canAccess,
    isLocked: !canAccess,
    researcher: {
      id: pub.researcher.user.id,
      name: `${pub.researcher.user.firstName} ${pub.researcher.user.lastName}`,
      profilePicture: normalizePublicAssetUrl(pub.researcher.user.profilePicture),
      verificationStatus: pub.researcher.user.verificationStatus,
      verificationTags: formatVerificationTags(pub.researcher.user.verificationTags ?? []),
    },
  };
}

function formatComment(comment: {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    verificationStatus: string;
    verificationTags?: { id: string; tagType: string; createdAt: Date }[];
  };
}) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      name: `${comment.user.firstName} ${comment.user.lastName}`,
      profilePicture: normalizePublicAssetUrl(comment.user.profilePicture),
      verificationStatus: comment.user.verificationStatus,
      verificationTags: formatVerificationTags(comment.user.verificationTags ?? []),
    },
  };
}

export class ResearcherService {
  private async getResearcherProfile(userId: string) {
    return assertFound(
      await prisma.researcherProfile.findUnique({ where: { userId } }),
      'Researcher profile not found'
    );
  }

  private assertPublicationPolicyAccepted(profile: { publicationPolicyAcceptedAt: Date | null }) {
    assertAuthorized(
      !!profile.publicationPolicyAcceptedAt,
      'You must accept the publication policy before publishing research'
    );
  }

  async getPublicationPolicyStatus(userId: string, roleId: number) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can view publication policy status');
    const profile = await this.getResearcherProfile(userId);
    return {
      accepted: !!profile.publicationPolicyAcceptedAt,
      acceptedAt: profile.publicationPolicyAcceptedAt?.toISOString() ?? null,
    };
  }

  async acceptPublicationPolicy(userId: string, roleId: number) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can accept the publication policy');
    const profile = await this.getResearcherProfile(userId);

    if (profile.publicationPolicyAcceptedAt) {
      return {
        accepted: true,
        acceptedAt: profile.publicationPolicyAcceptedAt.toISOString(),
      };
    }

    const updated = await prisma.researcherProfile.update({
      where: { userId },
      data: { publicationPolicyAcceptedAt: new Date() },
    });

    return {
      accepted: true,
      acceptedAt: updated.publicationPolicyAcceptedAt!.toISOString(),
    };
  }

  async ensurePublicationPolicyAccepted(userId: string, roleId: number) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can publish');
    const profile = await this.getResearcherProfile(userId);
    this.assertPublicationPolicyAccepted(profile);
  }

  private async getActivePublication(publicationId: string) {
    return assertFound(
      await prisma.researchPublication.findFirst({
        where: { id: publicationId, status: 'ACTIVE' },
      }),
      'Publication not found'
    );
  }

  /** Platform admins never pay access fees anywhere on the platform. */
  private async userIsPlatformAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });
    return user?.roleId === ROLES.ADMIN;
  }

  private async userHasPublicationAccess(
    userId: string,
    pub: { id: string; researcherId: string; isFree: boolean; price?: number | null }
  ) {
    if (publicationIsFreeAccess(pub)) return true;
    if (await this.userIsPlatformAdmin(userId)) return true;
    const researcherProfile = await prisma.researcherProfile.findUnique({ where: { userId } });
    if (researcherProfile?.id === pub.researcherId) return true;
    const purchase = await prisma.researchPurchase.findFirst({
      where: { studentId: userId, publicationId: pub.id, status: 'COMPLETED' },
    });
    return !!purchase;
  }

  private async assertPublicationAccess(userId: string, publicationId: string) {
    const pub = await this.getActivePublication(publicationId);
    const hasAccess = await this.userHasPublicationAccess(userId, pub);
    assertAuthorized(hasAccess, 'You must unlock this publication before commenting');
    return pub;
  }

  private async getLikedPublicationIds(userId: string, publicationIds: string[]) {
    if (!publicationIds.length) return new Set<string>();
    const likes = await prisma.researchPublicationLike.findMany({
      where: { userId, publicationId: { in: publicationIds } },
      select: { publicationId: true },
    });
    return new Set(likes.map((l) => l.publicationId));
  }

  private async getCommentCounts(publicationIds: string[]) {
    if (!publicationIds.length) return new Map<string, number>();
    const counts = await prisma.researchComment.groupBy({
      by: ['publicationId'],
      where: { publicationId: { in: publicationIds } },
      _count: { _all: true },
    });
    return new Map(counts.map((c) => [c.publicationId, c._count._all]));
  }

  async createPublication(userId: string, roleId: number, data: z.infer<typeof publicationSchema>) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can create publications');
    const profile = await this.getResearcherProfile(userId);
    this.assertPublicationPolicyAccepted(profile);

    const isFree = data.isFree ?? (data.price == null || data.price <= 0);
    if (!isFree && (!data.price || data.price <= 0)) {
      throw new AppError(400, 'Paid publications need a price greater than 0');
    }

    const publication = await prisma.researchPublication.create({
      data: {
        researcherId: profile.id,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        coverImage: data.coverImage,
        category: data.category,
        price: isFree ? null : data.price,
        isFree,
      },
      include: publicationInclude,
    });

    const researcherName = `${publication.researcher.user.firstName} ${publication.researcher.user.lastName}`.trim();
    notifyNewPublication({
      researcherUserId: userId,
      researcherName,
      publication: {
        id: publication.id,
        title: publication.title,
        description: publication.description,
        coverImage: publication.coverImage,
      },
    }).catch(() => undefined);

    return publication;
  }

  async updatePublication(
    userId: string,
    roleId: number,
    publicationId: string,
    data: z.infer<typeof updatePublicationSchema>
  ) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can update publications');
    const profile = await this.getResearcherProfile(userId);

    const existing = assertFound(
      await prisma.researchPublication.findFirst({
        where: { id: publicationId, researcherId: profile.id },
      }),
      'Publication not found'
    );

    const isFree =
      data.isFree !== undefined
        ? data.isFree
        : data.price !== undefined
          ? data.price <= 0
          : existing.isFree;

    if (!isFree) {
      const nextPrice = data.price ?? existing.price;
      if (!nextPrice || nextPrice <= 0) {
        throw new AppError(400, 'Paid publications need a price greater than 0');
      }
    }

    return prisma.researchPublication.update({
      where: { id: publicationId },
      data: {
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        coverImage: data.coverImage,
        category: data.category,
        price: isFree ? null : (data.price ?? existing.price),
        isFree,
      },
      include: publicationInclude,
    });
  }

  async deletePublication(userId: string, roleId: number, publicationId: string) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can delete publications');
    const profile = await this.getResearcherProfile(userId);

    const existing = assertFound(
      await prisma.researchPublication.findFirst({
        where: { id: publicationId, researcherId: profile.id },
      }),
      'Publication not found'
    );

    await prisma.researchPublication.update({
      where: { id: existing.id },
      data: { status: 'ARCHIVED' },
    });

    return { message: 'Publication archived' };
  }

  async myPublications(userId: string, roleId: number) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can view their publications');
    const profile = await this.getResearcherProfile(userId);

    const pubs = await prisma.researchPublication.findMany({
      where: { researcherId: profile.id, status: 'ACTIVE' },
      include: publicationInclude,
      orderBy: { createdAt: 'desc' },
    });

    return pubs.map((p) => formatPublication(p, { includeFile: true, isOwner: true }));
  }

  async browsePublications(userId: string, query?: string) {
    const where = {
      status: 'ACTIVE' as const,
      ...(query?.trim()
        ? {
            OR: [
              { title: { contains: query.trim(), mode: 'insensitive' as const } },
              { description: { contains: query.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [publications, purchases] = await Promise.all([
      prisma.researchPublication.findMany({
        where,
        include: publicationInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.researchPurchase.findMany({
        where: { studentId: userId, status: 'COMPLETED' },
        select: { publicationId: true },
      }),
    ]);

    const purchasedIds = new Set(purchases.map((p) => p.publicationId));
    const [researcherProfile, isPlatformAdmin] = await Promise.all([
      prisma.researcherProfile.findUnique({ where: { userId } }),
      this.userIsPlatformAdmin(userId),
    ]);
    const pubIds = publications.map((p) => p.id);
    const [likedIds, commentCounts] = await Promise.all([
      this.getLikedPublicationIds(userId, pubIds),
      this.getCommentCounts(pubIds),
    ]);

    return publications.map((p) => {
      const isOwner = researcherProfile?.id === p.researcherId;
      const hasAccess =
        isPlatformAdmin || isOwner || publicationIsFreeAccess(p) || purchasedIds.has(p.id);
      return formatPublication(p, {
        hasAccess,
        isOwner,
        likedByMe: likedIds.has(p.id),
        commentsCount: commentCounts.get(p.id) ?? 0,
      });
    });
  }

  async browsePublishers(userId: string, query?: string) {
    const publications = await this.browsePublications(userId, query);
    const researcherProfile = await prisma.researcherProfile.findUnique({ where: { userId } });

    const profiles = await prisma.researcherProfile.findMany({
      where: {
        publications: { some: { status: 'ACTIVE' } },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            verificationStatus: true,
            verificationTags: { select: { id: true, tagType: true, createdAt: true } },
          },
        },
      },
    });

    const profileByUserId = new Map(profiles.map((p) => [p.user.id, p]));

    type PublisherBucket = {
      id: string;
      name: string;
      profilePicture: string | null;
      institution: string | null;
      bio: string | null;
      qualifications: string[];
      verificationStatus: string;
      verificationTags: ReturnType<typeof formatVerificationTags>;
      publicationCount: number;
      hasPaidPublications: boolean;
      unlockedCount: number;
      isOwner: boolean;
      searchTerms: string;
    };

    const buckets = new Map<string, PublisherBucket>();

    for (const pub of publications) {
      const researcherUserId = pub.researcher.id;
      const profile = profileByUserId.get(researcherUserId);
      const isOwner = researcherProfile?.userId === researcherUserId;
      const hasAccess = !!pub.hasAccess;

      const existing = buckets.get(researcherUserId);
      if (existing) {
        existing.publicationCount += 1;
        if (!pub.isFree) existing.hasPaidPublications = true;
        if (hasAccess) existing.unlockedCount += 1;
        existing.searchTerms += ` ${pub.title} ${pub.description ?? ''}`;
      } else {
        buckets.set(researcherUserId, {
          id: researcherUserId,
          name: pub.researcher.name,
          profilePicture: pub.researcher.profilePicture ?? null,
          institution: profile?.institution ?? null,
          bio: profile?.bio ?? null,
          qualifications: profile?.qualifications ?? [],
          verificationStatus: pub.researcher.verificationStatus ?? 'UNVERIFIED',
          verificationTags: pub.researcher.verificationTags ?? [],
          publicationCount: 1,
          hasPaidPublications: !pub.isFree,
          unlockedCount: hasAccess ? 1 : 0,
          isOwner,
          searchTerms: [
            pub.researcher.name,
            profile?.institution,
            profile?.bio,
            ...(profile?.qualifications ?? []),
            pub.title,
            pub.description,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        });
      }
    }

    const term = query?.trim().toLowerCase() ?? '';
    return Array.from(buckets.values())
      .filter((p) => !term || p.searchTerms.includes(term))
      .map((p) => ({
        id: p.id,
        name: p.name,
        profilePicture: normalizePublicAssetUrl(p.profilePicture),
        institution: p.institution,
        bio: p.bio,
        qualifications: p.qualifications,
        verificationStatus: p.verificationStatus,
        verificationTags: p.verificationTags,
        publicationCount: p.publicationCount,
        canViewFiles: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPublisherLibrary(userId: string, publisherUserId: string) {
    const profile = assertFound(
      await prisma.researcherProfile.findUnique({
        where: { userId: publisherUserId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
              verificationStatus: true,
              verificationTags: { select: { id: true, tagType: true, createdAt: true } },
            },
          },
        },
      }),
      'Publisher not found'
    );

    const publications = await prisma.researchPublication.findMany({
      where: { researcherId: profile.id, status: 'ACTIVE' },
      include: publicationInclude,
      orderBy: { createdAt: 'desc' },
    });

    if (publications.length === 0) {
      throw new AppError(404, 'Publisher not found');
    }

    const [purchases, researcherProfile, isPlatformAdmin] = await Promise.all([
      prisma.researchPurchase.findMany({
        where: { studentId: userId, status: 'COMPLETED' },
        select: { publicationId: true },
      }),
      prisma.researcherProfile.findUnique({ where: { userId } }),
      this.userIsPlatformAdmin(userId),
    ]);

    const purchasedIds = new Set(purchases.map((p) => p.publicationId));
    const isOwner = researcherProfile?.id === profile.id;
    const pubIds = publications.map((p) => p.id);
    const [likedIds, commentCounts] = await Promise.all([
      this.getLikedPublicationIds(userId, pubIds),
      this.getCommentCounts(pubIds),
    ]);

    const formattedPublications = publications.map((p) => {
      const hasAccess =
        isPlatformAdmin || isOwner || publicationIsFreeAccess(p) || purchasedIds.has(p.id);
      return formatPublication(p, {
        hasAccess,
        isOwner,
        likedByMe: likedIds.has(p.id),
        commentsCount: commentCounts.get(p.id) ?? 0,
      });
    });

    return {
      publisher: {
        id: profile.user.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
        profilePicture: normalizePublicAssetUrl(profile.user.profilePicture),
        institution: profile.institution,
        bio: profile.bio,
        expertise: profile.expertise,
        qualifications: profile.qualifications ?? [],
        verificationStatus: profile.user.verificationStatus,
        verificationTags: formatVerificationTags(profile.user.verificationTags ?? []),
        publicationCount: formattedPublications.length,
        canViewFiles: true,
      },
      publications: formattedPublications,
    };
  }

  async getPublication(userId: string, roleId: number, publicationId: string) {
    const pub = assertFound(
      await prisma.researchPublication.findFirst({
        where: { id: publicationId, status: 'ACTIVE' },
        include: publicationInclude,
      }),
      'Publication not found'
    );

    const researcherProfile = await prisma.researcherProfile.findUnique({ where: { userId } });
    const isOwner = researcherProfile?.id === pub.researcherId;

    const hasAccess = await this.userHasPublicationAccess(userId, pub);

    const [likedByMe, commentsCount] = await Promise.all([
      prisma.researchPublicationLike
        .findUnique({
          where: { publicationId_userId: { publicationId, userId } },
        })
        .then((l) => !!l),
      prisma.researchComment.count({ where: { publicationId } }),
    ]);

    return formatPublication(pub, { hasAccess, isOwner, includeFile: hasAccess, likedByMe, commentsCount });
  }

  async getPublicationDocument(userId: string, publicationId: string) {
    const pub = await this.getActivePublication(publicationId);
    const hasAccess = await this.userHasPublicationAccess(userId, pub);
    assertAuthorized(hasAccess, 'You must unlock this publication before reading');

    if (!pub.fileUrl?.trim()) {
      throw new AppError(404, 'This publication has no document attached');
    }

    const safeTitle = pub.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'publication';
    return resolvePublicationDocument(pub.fileUrl, `${safeTitle}.pdf`);
  }

  async recordView(userId: string, publicationId: string) {
    const pub = assertFound(
      await prisma.researchPublication.findFirst({
        where: { id: publicationId, status: 'ACTIVE' },
      }),
      'Publication not found'
    );

    await prisma.$transaction([
      prisma.researchView.create({
        data: { publicationId, userId },
      }),
      prisma.researchPublication.update({
        where: { id: publicationId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);

    return { viewCount: pub.viewCount + 1 };
  }

  async purchasePublication(
    studentId: string,
    roleId: number,
    publicationId: string,
    data: z.infer<typeof purchasePublicationSchema>
  ) {
    if (isResearcherRole(roleId)) {
      throw new AppError(403, 'Researchers cannot purchase publications');
    }
    if (roleId === ROLES.ADMIN) {
      throw new AppError(
        400,
        'Platform admins already have free access to every publication — use Read Now instead.'
      );
    }
    assertAuthorized(
      canPurchasePublication(roleId),
      'Your account type cannot purchase publications'
    );

    const pub = assertFound(
      await prisma.researchPublication.findFirst({
        where: { id: publicationId, status: 'ACTIVE' },
        include: {
          researcher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
      }),
      'Publication not found'
    );

    if (pub.isFree) {
      throw new AppError(400, 'This publication is free - no payment required');
    }

    const researcherUserId = pub.researcher.user.id;
    if (studentId === researcherUserId) {
      throw new AppError(400, 'You already own this publication');
    }

    const existing = await prisma.researchPurchase.findUnique({
      where: { studentId_publicationId: { studentId, publicationId } },
    });
    if (existing?.status === 'COMPLETED') {
      throw new AppError(400, 'You already purchased this publication');
    }

    const amount = pub.price ?? 0;
    if (amount <= 0) {
      throw new AppError(400, 'Invalid publication price');
    }

    const provider = getPaymentProvider();
    const result = await provider.initiatePayment({
      userId: studentId,
      amount,
      paymentMethod: data.paymentMethod,
      referenceId: publicationId,
      type: 'RESEARCH_PURCHASE',
    });

    if (result.status === 'FAILED') {
      throw new AppError(402, 'Payment failed');
    }

    const purchase = await prisma.researchPurchase.upsert({
      where: { studentId_publicationId: { studentId, publicationId } },
      create: {
        publicationId,
        studentId,
        researcherId: researcherUserId,
        amount,
        paymentMethod: data.paymentMethod,
        transactionId: result.transactionId,
        status: result.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      },
      update: {
        amount,
        paymentMethod: data.paymentMethod,
        transactionId: result.transactionId,
        status: result.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      },
    });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true },
    });
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'A student';

    await notifyResearchPurchase(
      researcherUserId,
      studentId,
      studentName,
      pub.title,
      amount,
      publicationResearcherShareAmount(amount)
    );

    return {
      purchase,
      message: `Access granted to "${pub.title}"`,
      totalPaid: amount,
    };
  }

  async getFinancialStatement(userId: string, roleId: number) {
    assertAuthorized(isResearcherRole(roleId), 'Financial statement only available to researchers');
    return this.buildFinancialStatement(userId);
  }

  async buildFinancialStatement(researcherUserId: string) {
    const profile = assertFound(
      await prisma.researcherProfile.findUnique({
        where: { userId: researcherUserId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, country: true, region: true } },
          publications: { orderBy: { createdAt: 'desc' } },
        },
      }),
      'Researcher profile not found'
    );

    const paidPurchases = await prisma.researchPurchase.findMany({
      where: { researcherId: researcherUserId, status: 'COMPLETED' },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        publication: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const lineItems = profile.publications
      .filter((p) => p.status === 'ACTIVE')
      .map((pub) => ({
        id: pub.id,
        date: pub.createdAt.toISOString(),
        title: pub.title,
        isFree: pub.isFree,
        price: pub.price,
        viewCount: pub.viewCount,
        type: 'PUBLICATION' as const,
      }));

    const salesLineItems = paidPurchases.map((p) => ({
      id: p.id,
      date: p.createdAt.toISOString(),
      title: p.publication.title,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      studentEmail: p.student.email,
      grossAmount: p.amount,
      amount: publicationResearcherShareAmount(p.amount),
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
      type: 'SALE' as const,
    }));

    const totalEarnings = salesLineItems.reduce((acc, s) => acc + s.amount, 0);
    const totalViews = lineItems.reduce((acc, l) => acc + l.viewCount, 0);
    const paidPublications = lineItems.filter((l) => !l.isFree).length;
    const freePublications = lineItems.filter((l) => l.isFree).length;

    return {
      institution: profile.institution,
      researcherName: `${profile.user.firstName} ${profile.user.lastName}`,
      email: profile.user.email,
      country: profile.user.country,
      region: profile.user.region,
      generatedAt: new Date().toISOString(),
      summary: {
        totalPublications: lineItems.length,
        freePublications,
        paidPublications,
        totalViews,
        totalSales: salesLineItems.length,
        totalEarnings,
      },
      lineItems,
      salesLineItems,
    };
  }

  async updateProfile(
    userId: string,
    roleId: number,
    data: z.infer<typeof updateResearcherProfileSchema>
  ) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can update researcher profile');
    const updateData: {
      institution?: string;
      expertise?: string;
      bio?: string;
      qualifications?: string[];
    } = { ...data };
    if (data.qualifications !== undefined) {
      updateData.qualifications = normalizeQualifications(data.qualifications);
    }
    return prisma.researcherProfile.update({
      where: { userId },
      data: updateData,
    });
  }

  async toggleLike(publicationId: string, userId: string) {
    const pub = await this.getActivePublication(publicationId);

    const existing = await prisma.researchPublicationLike.findUnique({
      where: { publicationId_userId: { publicationId, userId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.researchPublicationLike.delete({ where: { id: existing.id } }),
        prisma.researchPublication.update({
          where: { id: publicationId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      const updated = await prisma.researchPublication.findUnique({ where: { id: publicationId } });
      return { liked: false, likesCount: updated?.likesCount ?? 0 };
    }

    await prisma.$transaction([
      prisma.researchPublicationLike.create({ data: { publicationId, userId } }),
      prisma.researchPublication.update({
        where: { id: publicationId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    const updated = await prisma.researchPublication.findUnique({ where: { id: publicationId } });

    const [actor, researcher] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
      prisma.researcherProfile.findUnique({
        where: { id: pub.researcherId },
        select: { userId: true },
      }),
    ]);
    if (actor && researcher) {
      await notifyPublicationLiked({
        researcherUserId: researcher.userId,
        actorId: userId,
        actorName: getFullName(actor.firstName, actor.lastName),
        publicationId: pub.id,
        publicationTitle: pub.title,
        coverImage: pub.coverImage,
      });
    }

    return { liked: true, likesCount: updated?.likesCount ?? 0 };
  }

  async recordShare(publicationId: string) {
    const pub = await this.getActivePublication(publicationId);

    const updated = await prisma.researchPublication.update({
      where: { id: pub.id },
      data: { sharesCount: { increment: 1 } },
    });

    return { sharesCount: updated.sharesCount };
  }

  async listComments(publicationId: string) {
    await this.getActivePublication(publicationId);

    const comments = await prisma.researchComment.findMany({
      where: { publicationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            verificationStatus: true,
            verificationTags: { select: verificationTagSelect },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map(formatComment);
  }

  async addComment(publicationId: string, userId: string, data: z.infer<typeof commentSchema>) {
    const pub = await this.assertPublicationAccess(userId, publicationId);
    const content = data.content.trim();

    const comment = await prisma.researchComment.create({
      data: {
        publicationId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            verificationStatus: true,
            verificationTags: { select: verificationTagSelect },
          },
        },
      },
    });

    const researcher = await prisma.researcherProfile.findUnique({
      where: { id: pub.researcherId },
      select: { userId: true },
    });
    if (researcher) {
      await notifyPublicationCommented({
        researcherUserId: researcher.userId,
        actorId: userId,
        actorName: getFullName(comment.user.firstName, comment.user.lastName),
        publicationId: pub.id,
        publicationTitle: pub.title,
        commentSnippet: content,
        coverImage: pub.coverImage,
      });
    }

    return formatComment(comment);
  }

  async listClients(userId: string, roleId: number) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can list clients');
    return listPortalDirectoryClients(userId);
  }

  async notifyClient(
    researcherUserId: string,
    roleId: number,
    data: z.infer<typeof notifyClientSchema>
  ) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can notify clients');
    const client = assertFound(
      await prisma.user.findFirst({
        where: { id: data.clientId, roleId: { in: [...PORTAL_DIRECTORY_ROLES] } },
        select: { id: true },
      }),
      'Client not found'
    );
    await notifyResearchPublicationsAvailable({
      researcherUserId,
      clientId: client.id,
      customMessage: data.message,
    });
    return { success: true };
  }
}

export const researcherService = new ResearcherService();
