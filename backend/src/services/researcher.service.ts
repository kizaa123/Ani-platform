import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError, assertFound, assertAuthorized } from '../utils/errors';
import { ROLES, isResearcherRole } from '../constants/roles';
import { getPaymentProvider } from './payment.provider';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { notifyResearchPurchase } from './notification.service';

export const publicationSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  fileUrl: z.string().min(1),
  coverImage: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  isFree: z.boolean().optional(),
});

export const updatePublicationSchema = publicationSchema.partial();

export const purchasePublicationSchema = z.object({
  paymentMethod: z.string().min(2),
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
        },
      },
    },
  },
} as const;

function formatPublication(
  pub: {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    coverImage: string | null;
    price: number | null;
    isFree: boolean;
    viewCount: number;
    status: string;
    createdAt: Date;
    researcher: {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        profilePicture: string | null;
        verificationStatus: string;
      };
    };
  },
  options: { includeFile?: boolean; hasAccess?: boolean; isOwner?: boolean } = {}
) {
  const canAccess = options.isOwner || pub.isFree || options.hasAccess;
  return {
    id: pub.id,
    title: pub.title,
    description: pub.description,
    fileUrl: canAccess && options.includeFile !== false ? normalizePublicAssetUrl(pub.fileUrl) : null,
    coverImage: normalizePublicAssetUrl(pub.coverImage),
    price: pub.price,
    isFree: pub.isFree,
    viewCount: pub.viewCount,
    status: pub.status,
    createdAt: pub.createdAt.toISOString(),
    hasAccess: !!canAccess,
    isLocked: !canAccess,
    researcher: {
      id: pub.researcher.user.id,
      name: `${pub.researcher.user.firstName} ${pub.researcher.user.lastName}`,
      profilePicture: normalizePublicAssetUrl(pub.researcher.user.profilePicture),
      verificationStatus: pub.researcher.user.verificationStatus,
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

  async createPublication(userId: string, roleId: number, data: z.infer<typeof publicationSchema>) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can create publications');
    const profile = await this.getResearcherProfile(userId);

    const isFree = data.isFree ?? (data.price == null || data.price <= 0);

    return prisma.researchPublication.create({
      data: {
        researcherId: profile.id,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        coverImage: data.coverImage,
        price: isFree ? null : data.price,
        isFree,
      },
      include: publicationInclude,
    });
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

    return prisma.researchPublication.update({
      where: { id: publicationId },
      data: {
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        coverImage: data.coverImage,
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
    const researcherProfile = await prisma.researcherProfile.findUnique({ where: { userId } });

    return publications.map((p) =>
      formatPublication(p, {
        hasAccess: purchasedIds.has(p.id),
        isOwner: researcherProfile?.id === p.researcherId,
        includeFile: false,
      })
    );
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

    let hasAccess = pub.isFree || isOwner;
    if (!hasAccess) {
      const purchase = await prisma.researchPurchase.findFirst({
        where: { studentId: userId, publicationId, status: 'COMPLETED' },
      });
      hasAccess = !!purchase;
    }

    return formatPublication(pub, { hasAccess, isOwner, includeFile: hasAccess });
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
      throw new AppError(400, 'This publication is free — no payment required');
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
      amount
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
      amount: p.amount,
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

  async updateProfile(userId: string, roleId: number, data: { institution?: string; expertise?: string; bio?: string }) {
    assertAuthorized(isResearcherRole(roleId), 'Only researchers can update researcher profile');
    return prisma.researcherProfile.update({
      where: { userId },
      data,
    });
  }
}

export const researcherService = new ResearcherService();
