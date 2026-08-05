import { z } from 'zod';
import prisma from '../database/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../utils/jwt';
import { AppError, assertFound } from '../utils/errors';
import {
  ROLES,
  FARMER_ROLES,
  REGISTERABLE_ROLE_IDS,
  isFarmerRole,
  isFarmerHandler,
  isBuyerHandler,
} from '../constants/roles';
import { categoryMatchesFarmerRole } from '../constants/commodities';
import { formatVerificationTags, verificationTagSelect } from '../utils/verificationTags';
import { defaultListingUnit } from '../constants/units';
import { normalizeQualifications } from '../constants/qualifications';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';
import { normalizePhone, normalizePhoneForStorage, isValidPhoneNumber, PHONE_VALIDATION_MESSAGE } from '../utils/phone';
import { emailVerificationService } from './emailVerification.service';
import { phoneVerificationService } from './phoneVerification.service';
import { isPhoneSmsVerificationEnabled } from '../config/sms.config';
import {
  notifyHandlerDropped,
  notifyNewFarmerJoined,
  notifyAdminsPendingAccountant,
  notifyAccountantRegistrationSubmitted,
} from './notification.service';

const phoneInputSchema = z.preprocess(normalizePhone, z.string().min(1, 'Enter your phone number'));

const emptyToUndefined = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};

const optionalString = () =>
  z.preprocess(emptyToUndefined, z.string().optional());

function normalizeCustomProducts(products: unknown): string[] {
  if (!Array.isArray(products)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of products) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length < 2 || trimmed.length > 100) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

async function resolveCommodityNamesInOrder(commodityIds: number[]): Promise<string[]> {
  if (!commodityIds.length) return [];
  const rows = await prisma.commodity.findMany({
    where: { id: { in: commodityIds } },
    select: { id: true, name: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row.name]));
  return commodityIds
    .map((id) => byId.get(id))
    .filter((name): name is string => Boolean(name));
}

export const registerSchema = z
  .object({
    firstName: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    lastName: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    email: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
      z.string().email()
    ),
    phone: phoneInputSchema,
    password: z.string().min(8),
    profilePicture: optionalString(),
    country: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    region: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    city: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    address: optionalString(),
    gpsLatitude: z.coerce.number().optional(),
    gpsLongitude: z.coerce.number().optional(),
    roleId: z.coerce
      .number()
      .int()
      .refine(
        (id): id is (typeof REGISTERABLE_ROLE_IDS)[number] =>
          (REGISTERABLE_ROLE_IDS as readonly number[]).includes(id),
        { message: 'Invalid role for registration' }
      ),
    farmName: optionalString(),
    farmSize: optionalString(),
    experienceYears: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).optional()
    ),
    institution: optionalString(),
    expertise: optionalString(),
    qualifications: z.preprocess(
      emptyToUndefined,
      z.array(z.string()).optional()
    ),
    commodityIds: z.preprocess(
      emptyToUndefined,
      z.array(z.coerce.number().int()).optional()
    ),
    customProducts: z.preprocess(
      emptyToUndefined,
      z.array(z.string()).optional()
    ),
    company: optionalString(),
    handlerId: z.preprocess(
      emptyToUndefined,
      z.string().uuid().optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (!isValidPhoneNumber(data.phone, data.country)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: PHONE_VALIDATION_MESSAGE,
        path: ['phone'],
      });
    }
    const needsHandler =
      FARMER_ROLES.includes(data.roleId as typeof ROLES.CROP_FARMER) ||
      data.roleId === ROLES.BUYER ||
      data.roleId === ROLES.RESEARCHER;
    if (needsHandler && !data.handlerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a handler',
        path: ['handlerId'],
      });
    }
  })
  .transform((data) => ({
    ...data,
    phone: normalizePhoneForStorage(data.phone, data.country),
  }));

export const loginSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().email()
  ),
  password: z.string(),
});

export const updateHandlerSchema = z.object({
  handlerId: z.string().uuid(),
});

export const completeProfileSchema = z
  .object({
    phone: phoneInputSchema,
    password: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
    profilePicture: optionalString(),
    country: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    region: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    city: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2)
    ),
    address: optionalString(),
    gpsLatitude: z.coerce.number().optional(),
    gpsLongitude: z.coerce.number().optional(),
    roleId: z.coerce
      .number()
      .int()
      .refine(
        (id): id is (typeof REGISTERABLE_ROLE_IDS)[number] =>
          (REGISTERABLE_ROLE_IDS as readonly number[]).includes(id),
        { message: 'Invalid role for registration' }
      ),
    farmName: optionalString(),
    farmSize: optionalString(),
    experienceYears: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).optional()
    ),
    institution: optionalString(),
    expertise: optionalString(),
    qualifications: z.preprocess(
      emptyToUndefined,
      z.array(z.string()).optional()
    ),
    commodityIds: z.preprocess(
      emptyToUndefined,
      z.array(z.coerce.number().int()).optional()
    ),
    customProducts: z.preprocess(
      emptyToUndefined,
      z.array(z.string()).optional()
    ),
    company: optionalString(),
    handlerId: z.preprocess(
      emptyToUndefined,
      z.string().uuid().optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (!isValidPhoneNumber(data.phone, data.country)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: PHONE_VALIDATION_MESSAGE,
        path: ['phone'],
      });
    }
    const needsHandler =
      FARMER_ROLES.includes(data.roleId as typeof ROLES.CROP_FARMER) ||
      data.roleId === ROLES.BUYER ||
      data.roleId === ROLES.RESEARCHER;
    if (needsHandler && !data.handlerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a handler',
        path: ['handlerId'],
      });
    }
  })
  .transform((data) => ({
    ...data,
    phone: normalizePhoneForStorage(data.phone, data.country),
  }));

export const emailVerificationSendSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().email()
  ),
});

export const emailVerificationVerifySchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().email()
  ),
  challengeId: z.string().uuid(),
  code: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().regex(/^\d{4}$/, 'Enter the 4-digit code from your email')
  ),
});

export const phoneVerificationPublicSendSchema = z.object({
  phone: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'Phone number is required')
  ),
  country: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(2, 'Country is required')
  ),
});

export const phoneVerificationSendSchema = z.object({
  phone: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  ),
  country: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  ),
});

export const phoneVerificationVerifySchema = z.object({
  phone: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  ),
  challengeId: z.string().uuid(),
  code: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().regex(/^\d{4}$/, 'Enter the 4-digit code from your SMS')
  ),
  country: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  ),
});

export const phoneVerificationPublicVerifySchema = phoneVerificationVerifySchema.extend({
  phone: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'Phone number is required')
  ),
  country: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(2, 'Country is required')
  ),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.preprocess(normalizePhone, z.string().optional()),
  country: z.string().min(2).optional(),
  region: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  address: z.string().optional(),
});

function sanitizeUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: number;
  verificationStatus: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileComplete?: boolean;
  googleId?: string | null;
  role: { roleName: string };
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || undefined,
    role: user.role.roleName,
    roleId: user.roleId,
    verificationStatus: user.verificationStatus,
    emailVerified: user.emailVerified ?? true,
    phoneVerified: user.phoneVerified ?? false,
    profileComplete: user.profileComplete ?? true,
    hasGoogleAuth: Boolean(user.googleId),
  };
}

export class AuthService {
  async register(input: z.infer<typeof registerSchema>) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Email already registered');

    const role = assertFound(
      await prisma.role.findUnique({ where: { id: input.roleId } }),
      'Invalid role'
    );

    if (!isValidPhoneNumber(input.phone, input.country)) {
      throw new AppError(400, PHONE_VALIDATION_MESSAGE);
    }

    if (isPhoneSmsVerificationEnabled()) {
      await phoneVerificationService.assertPhoneVerifiedRecently(input.phone, input.country);
    }

    if (!input.password) {
      throw new AppError(400, 'Password is required for email registration');
    }
    const passwordHash = await hashPassword(input.password);

    if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
      const customProducts = normalizeCustomProducts(input.customProducts);
      const requiredLabel =
        input.roleId === ROLES.CROP_FARMER
          ? 'crop'
          : input.roleId === ROLES.LIVESTOCK_FARMER
            ? 'livestock'
            : 'commodity';
      if (!input.commodityIds?.length && customProducts.length === 0) {
        throw new AppError(
          400,
          `Select at least one ${requiredLabel} commodity or add a custom product`
        );
      }
      for (const commodityId of input.commodityIds ?? []) {
        const commodity = await prisma.commodity.findUnique({
          where: { id: commodityId },
          include: { category: true },
        });
        if (
          !commodity ||
          !categoryMatchesFarmerRole(
            commodity.category.name,
            input.roleId,
            ROLES.CROP_FARMER,
            ROLES.LIVESTOCK_FARMER,
            ROLES.ORGANIZATION_FARMER
          )
        ) {
          throw new AppError(400, `Commodity must belong to a ${requiredLabel} category for this farmer role`);
        }
      }
    }

    if (
      input.handlerId &&
      (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER) ||
        input.roleId === ROLES.BUYER ||
        input.roleId === ROLES.RESEARCHER)
    ) {
      const handler = assertFound(
        await prisma.user.findUnique({ where: { id: input.handlerId } }),
        'Selected handler not found'
      );
      const expectedFarmer = FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER);
      const expectedBuyerHandler =
        input.roleId === ROLES.BUYER || input.roleId === ROLES.RESEARCHER;
      if (expectedFarmer && !isFarmerHandler(handler.roleId)) {
        throw new AppError(400, 'Selected handler is not a farmer handler');
      }
      if (expectedBuyerHandler && !isBuyerHandler(handler.roleId)) {
        throw new AppError(400, 'Selected handler is not a buyer handler');
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          profilePicture: input.profilePicture,
          country: input.country,
          region: input.region,
          city: input.city,
          address: input.address,
          gpsLatitude: input.gpsLatitude,
          gpsLongitude: input.gpsLongitude,
          roleId: input.roleId,
          emailVerified: true,
          phoneVerified: isPhoneSmsVerificationEnabled(),
          profileComplete: true,
          ...(input.roleId === ROLES.ANI_ACCOUNTANT
            ? { verificationStatus: 'PENDING' as const }
            : {}),
        },
        include: { role: true },
      });

      if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
        const customProducts = normalizeCustomProducts(input.customProducts);
        const profile = await tx.farmerProfile.create({
          data: {
            userId: created.id,
            farmName:
              input.farmName ||
              (input.roleId === ROLES.ORGANIZATION_FARMER
                ? `${input.firstName}'s Organization`
                : `${input.firstName}'s Farm`),
            farmSize: input.farmSize,
            experienceYears: input.experienceYears,
            customProducts,
          },
        });

        if (input.commodityIds?.length) {
          for (const commodityId of input.commodityIds) {
            await tx.farmerCommodity.create({
              data: {
                farmerId: profile.id,
                commodityId,
                quantity: 0,
                unit: defaultListingUnit(input.roleId),
              },
            });
          }
        }
      }

      if (input.roleId === ROLES.BUYER) {
        await tx.buyerProfile.create({
          data: { userId: created.id, company: input.company },
        });
      }

      if (input.roleId === ROLES.RESEARCHER) {
        await tx.researcherProfile.create({
          data: {
            userId: created.id,
            institution: input.institution,
            expertise: input.expertise,
            qualifications: normalizeQualifications(input.qualifications ?? []),
          },
        });
      }

      if (input.roleId === ROLES.FARMER_HANDLER) {
        await tx.agentProfile.create({
          data: { userId: created.id, agentType: 'FARMER_REPRESENTATIVE' },
        });
      }

      if (input.roleId === ROLES.BUYER_HANDLER) {
        await tx.agentProfile.create({
          data: { userId: created.id, agentType: 'BUYER_REPRESENTATIVE' },
        });
      }

      if (
        input.handlerId &&
        (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER) ||
          input.roleId === ROLES.BUYER ||
          input.roleId === ROLES.RESEARCHER)
      ) {
        const relationshipType = FARMER_ROLES.includes(
          input.roleId as typeof ROLES.CROP_FARMER
        )
          ? 'FARMER_REPRESENTATIVE'
          : 'BUYER_REPRESENTATIVE';

        await tx.agentAssignment.create({
          data: {
            agentId: input.handlerId,
            ownerId: created.id,
            relationshipType,
          },
        });
      }

      return created;
    });

    const tokenPayload = { userId: user.id, email: user.email, roleId: user.roleId };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    await storeRefreshToken(user.id, refreshToken);

    if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
      const customProducts = normalizeCustomProducts(input.customProducts);
      const commodities = await resolveCommodityNamesInOrder(input.commodityIds ?? []);

      notifyNewFarmerJoined({
        farmerUserId: user.id,
        farmerName: `${user.firstName} ${user.lastName}`.trim(),
        farmSize: input.farmSize,
        city: user.city,
        region: user.region,
        country: user.country,
        commodities,
        customProducts,
      }).catch(() => undefined);
    }

    if (input.roleId === ROLES.ANI_ACCOUNTANT) {
      notifyAdminsPendingAccountant({
        accountantUserId: user.id,
        accountantName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
      }).catch(() => undefined);
      notifyAccountantRegistrationSubmitted({
        userId: user.id,
        firstName: user.firstName,
      }).catch(() => undefined);
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });

    return {
      user: sanitizeUser(fullUser!),
      accessToken,
      refreshToken,
      needsEmailVerification: false,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }
    if (!user.passwordHash) {
      throw new AppError(401, 'This account uses Google sign-in. Please continue with Google.');
    }
    if (!(await comparePassword(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated. Contact an administrator.');
    }

    const tokenPayload = { userId: user.id, email: user.email, roleId: user.roleId };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    await storeRefreshToken(user.id, refreshToken);

    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
    const payload = verifyRefreshToken(refreshToken);
    return { accessToken: generateAccessToken(payload) };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) await revokeRefreshToken(refreshToken);
  }

  async getProfile(userId: string) {
    const user = assertFound(
      await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          verificationTags: true,
          farmerProfile: { include: { farmerCommodities: { include: { commodity: true } } } },
          buyerProfile: true,
          agentProfile: true,
          researcherProfile: true,
        },
      }),
      'User not found'
    );

    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: user.roleId },
      include: { permission: true },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profilePicture: normalizePublicAssetUrl(user.profilePicture),
      country: user.country,
      region: user.region,
      city: user.city,
      address: user.address,
      gpsLatitude: user.gpsLatitude,
      gpsLongitude: user.gpsLongitude,
      role: user.role.roleName,
      roleId: user.roleId,
      verificationStatus: user.verificationStatus,
      emailVerified: user.emailVerified,
      phoneVerified: (user as any).phoneVerified ?? false,
      profileComplete: user.profileComplete,
      hasGoogleAuth: Boolean(user.googleId),
      verificationTags: user.verificationTags.map((tag) => ({
        id: tag.id,
        userId: tag.userId,
        tagType: tag.tagType,
        assignedBy: tag.assignedBy,
        createdAt: tag.createdAt.toISOString(),
      })),
      updatedAt: user.updatedAt.toISOString(),
      permissions: permissions.map((p) => p.permission.permissionName),
      farmerProfile: user.farmerProfile,
      buyerProfile: user.buyerProfile,
      agentProfile: user.agentProfile,
      researcherProfile: user.researcherProfile,
      assignedHandler: await this.getAssignedHandler(userId, user.roleId),
    };
  }

  async getAssignedHandler(userId: string, roleId: number) {
    const relationshipType =
      roleId === ROLES.BUYER || roleId === ROLES.RESEARCHER
        ? 'BUYER_REPRESENTATIVE'
        : FARMER_ROLES.includes(roleId as typeof ROLES.CROP_FARMER)
          ? 'FARMER_REPRESENTATIVE'
          : null;

    if (!relationshipType) return null;

    const assignment = await prisma.agentAssignment.findFirst({
      where: { ownerId: userId, relationshipType },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            country: true,
            region: true,
            city: true,
            profilePicture: true,
            updatedAt: true,
            verificationStatus: true,
            verificationTags: { select: verificationTagSelect },
          },
        },
      },
    });

    if (!assignment) return null;

    return {
      id: assignment.agent.id,
      firstName: assignment.agent.firstName,
      lastName: assignment.agent.lastName,
      email: assignment.agent.email,
      phone: assignment.agent.phone,
      country: assignment.agent.country,
      region: assignment.agent.region,
      city: assignment.agent.city,
      profilePicture: normalizePublicAssetUrl(assignment.agent.profilePicture),
      updatedAt: assignment.agent.updatedAt.toISOString(),
      verificationStatus: assignment.agent.verificationStatus,
      verificationTags: formatVerificationTags(assignment.agent.verificationTags ?? []),
    };
  }

  async updateAssignedHandler(userId: string, roleId: number, handlerId: string) {
    const relationshipType =
      roleId === ROLES.BUYER || roleId === ROLES.RESEARCHER
        ? 'BUYER_REPRESENTATIVE'
        : FARMER_ROLES.includes(roleId as typeof ROLES.CROP_FARMER)
          ? 'FARMER_REPRESENTATIVE'
          : null;

    if (!relationshipType) {
      throw new AppError(403, 'Only fellows, clients, and researchers can update their handler here');
    }

    const handler = assertFound(
      await prisma.user.findUnique({ where: { id: handlerId } }),
      'Handler not found'
    );
    if (relationshipType === 'BUYER_REPRESENTATIVE' && !isBuyerHandler(handler.roleId)) {
      throw new AppError(400, 'Selected user is not a buyer handler');
    }
    if (relationshipType === 'FARMER_REPRESENTATIVE' && !isFarmerHandler(handler.roleId)) {
      throw new AppError(400, 'Selected user is not a farmer handler');
    }

    const agentSelect = {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        region: true,
        profilePicture: true,
      },
    } as const;

    const owner = assertFound(
      await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          farmerProfile: { select: { farmName: true } },
          buyerProfile: { select: { company: true } },
        },
      }),
      'User not found'
    );

    const previousAssignment = await prisma.agentAssignment.findFirst({
      where: { ownerId: userId, relationshipType },
      select: { agentId: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      await tx.agentAssignment.deleteMany({
        where: { ownerId: userId, relationshipType },
      });

      return tx.agentAssignment.create({
        data: {
          agentId: handlerId,
          ownerId: userId,
          relationshipType,
        },
        include: { agent: agentSelect },
      });
    });

    if (previousAssignment && previousAssignment.agentId !== handlerId) {
      const ownerName =
        owner.farmerProfile?.farmName ??
        owner.buyerProfile?.company ??
        `${owner.firstName} ${owner.lastName}`;
      await notifyHandlerDropped(previousAssignment.agentId, ownerName, relationshipType);
    }

    return result;
  }

  async updateUserProfile(userId: string, data: z.infer<typeof updateUserProfileSchema>) {
    const existing = assertFound(
      await prisma.user.findUnique({
        where: { id: userId },
        select: { country: true },
      }),
      'User not found'
    );

    const country = data.country ?? existing.country;
    const updateData = { ...data };

    if (data.phone !== undefined) {
      if (!isValidPhoneNumber(data.phone, country)) {
        throw new AppError(400, PHONE_VALIDATION_MESSAGE);
      }
      updateData.phone = normalizePhoneForStorage(data.phone, country);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return this.getProfile(userId);
  }

  async markEmailVerified(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  async markPhoneVerified(userId: string, phone?: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        ...(phone ? { phone } : {}),
      } as any,
    });
  }

  async completeProfile(userId: string, input: z.infer<typeof completeProfileSchema>) {
    const user = assertFound(
      await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          farmerProfile: true,
          buyerProfile: true,
          researcherProfile: true,
          agentProfile: true,
        },
      }),
      'User not found'
    );

    if (user.profileComplete) {
      throw new AppError(400, 'Profile is already complete');
    }
    if (isPhoneSmsVerificationEnabled() && !(user as any).phoneVerified) {
      throw new AppError(400, 'Verify your phone number before completing your profile');
    }

    if (!isValidPhoneNumber(input.phone, input.country)) {
      throw new AppError(400, PHONE_VALIDATION_MESSAGE);
    }

    const isGoogleUser = Boolean(user.googleId);
    const passwordHash = isGoogleUser
      ? user.passwordHash
      : input.password
        ? await hashPassword(input.password)
        : user.passwordHash;

    const role = assertFound(
      await prisma.role.findUnique({ where: { id: input.roleId } }),
      'Invalid role'
    );

    if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
      const customProducts = normalizeCustomProducts(input.customProducts);
      const requiredLabel =
        input.roleId === ROLES.CROP_FARMER
          ? 'crop'
          : input.roleId === ROLES.LIVESTOCK_FARMER
            ? 'livestock'
            : 'commodity';
      if (!input.commodityIds?.length && customProducts.length === 0) {
        throw new AppError(
          400,
          `Select at least one ${requiredLabel} commodity or add a custom product`
        );
      }
      for (const commodityId of input.commodityIds ?? []) {
        const commodity = await prisma.commodity.findUnique({
          where: { id: commodityId },
          include: { category: true },
        });
        if (
          !commodity ||
          !categoryMatchesFarmerRole(
            commodity.category.name,
            input.roleId,
            ROLES.CROP_FARMER,
            ROLES.LIVESTOCK_FARMER,
            ROLES.ORGANIZATION_FARMER
          )
        ) {
          throw new AppError(400, `Commodity must belong to a ${requiredLabel} category for this farmer role`);
        }
      }
    }

    if (
      input.handlerId &&
      (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER) ||
        input.roleId === ROLES.BUYER ||
        input.roleId === ROLES.RESEARCHER)
    ) {
      const handler = assertFound(
        await prisma.user.findUnique({ where: { id: input.handlerId } }),
        'Selected handler not found'
      );
      const expectedFarmer = FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER);
      const expectedBuyerHandler =
        input.roleId === ROLES.BUYER || input.roleId === ROLES.RESEARCHER;
      if (expectedFarmer && !isFarmerHandler(handler.roleId)) {
        throw new AppError(400, 'Selected handler is not a farmer handler');
      }
      if (expectedBuyerHandler && !isBuyerHandler(handler.roleId)) {
        throw new AppError(400, 'Selected handler is not a buyer handler');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (user.farmerProfile) {
        await tx.farmerCommodity.deleteMany({
          where: { farmerId: user.farmerProfile.id },
        });
        await tx.farmerProfile.delete({ where: { userId } });
      }
      if (user.buyerProfile) {
        await tx.buyerProfile.delete({ where: { userId } });
      }
      if (user.researcherProfile) {
        await tx.researcherProfile.delete({ where: { userId } });
      }
      if (user.agentProfile) {
        await tx.agentProfile.delete({ where: { userId } });
      }
      await tx.agentAssignment.deleteMany({ where: { ownerId: userId } });

      const saved = await tx.user.update({
        where: { id: userId },
        data: {
          phone: input.phone,
          passwordHash,
          profilePicture: input.profilePicture ?? user.profilePicture,
          country: input.country,
          region: input.region,
          city: input.city,
          address: input.address,
          gpsLatitude: input.gpsLatitude,
          gpsLongitude: input.gpsLongitude,
          roleId: input.roleId,
          profileComplete: true,
          phoneVerified: isPhoneSmsVerificationEnabled() ? (user as any).phoneVerified : false,
          ...(input.roleId === ROLES.ANI_ACCOUNTANT
            ? { verificationStatus: 'PENDING' as const }
            : {}),
        },
        include: { role: true },
      });

      if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
        const customProducts = normalizeCustomProducts(input.customProducts);
        const profile = await tx.farmerProfile.create({
          data: {
            userId,
            farmName:
              input.farmName ||
              (input.roleId === ROLES.ORGANIZATION_FARMER
                ? `${user.firstName}'s Organization`
                : `${user.firstName}'s Farm`),
            farmSize: input.farmSize,
            experienceYears: input.experienceYears,
            customProducts,
          },
        });

        if (input.commodityIds?.length) {
          for (const commodityId of input.commodityIds) {
            await tx.farmerCommodity.create({
              data: {
                farmerId: profile.id,
                commodityId,
                quantity: 0,
                unit: defaultListingUnit(input.roleId),
              },
            });
          }
        }
      }

      if (input.roleId === ROLES.BUYER) {
        await tx.buyerProfile.create({
          data: { userId, company: input.company },
        });
      }

      if (input.roleId === ROLES.RESEARCHER) {
        await tx.researcherProfile.create({
          data: {
            userId,
            institution: input.institution,
            expertise: input.expertise,
            qualifications: normalizeQualifications(input.qualifications ?? []),
          },
        });
      }

      if (input.roleId === ROLES.FARMER_HANDLER) {
        await tx.agentProfile.create({
          data: { userId, agentType: 'FARMER_REPRESENTATIVE' },
        });
      }

      if (input.roleId === ROLES.BUYER_HANDLER) {
        await tx.agentProfile.create({
          data: { userId, agentType: 'BUYER_REPRESENTATIVE' },
        });
      }

      if (
        input.handlerId &&
        (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER) ||
          input.roleId === ROLES.BUYER ||
          input.roleId === ROLES.RESEARCHER)
      ) {
        const relationshipType = FARMER_ROLES.includes(
          input.roleId as typeof ROLES.CROP_FARMER
        )
          ? 'FARMER_REPRESENTATIVE'
          : 'BUYER_REPRESENTATIVE';

        await tx.agentAssignment.create({
          data: {
            agentId: input.handlerId,
            ownerId: userId,
            relationshipType,
          },
        });
      }

      return saved;
    });

    if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
      const customProducts = normalizeCustomProducts(input.customProducts);
      const commodities = await resolveCommodityNamesInOrder(input.commodityIds ?? []);

      notifyNewFarmerJoined({
        farmerUserId: updated.id,
        farmerName: `${updated.firstName} ${updated.lastName}`.trim(),
        farmSize: input.farmSize,
        city: updated.city,
        region: updated.region,
        country: updated.country,
        commodities,
        customProducts,
      }).catch(() => undefined);
    }

    if (input.roleId === ROLES.ANI_ACCOUNTANT) {
      notifyAdminsPendingAccountant({
        accountantUserId: updated.id,
        accountantName: `${updated.firstName} ${updated.lastName}`.trim(),
        email: updated.email,
      }).catch(() => undefined);
      notifyAccountantRegistrationSubmitted({
        userId: updated.id,
        firstName: updated.firstName,
      }).catch(() => undefined);
    }

    const tokenPayload = { userId: updated.id, email: updated.email, roleId: updated.roleId };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    await storeRefreshToken(updated.id, refreshToken);

    return {
      user: sanitizeUser(updated),
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
