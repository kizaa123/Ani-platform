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
import { defaultListingUnit } from '../constants/units';
import { normalizePublicAssetUrl } from '../middleware/upload.middleware';

const emptyToUndefined = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};

const optionalString = () =>
  z.preprocess(emptyToUndefined, z.string().optional());

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
  phone: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(9)
  ),
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
  commodityIds: z.preprocess(
    emptyToUndefined,
    z.array(z.coerce.number().int()).optional()
  ),
  company: optionalString(),
  handlerId: z.preprocess(
    emptyToUndefined,
    z.string().uuid().optional()
  ),
})
  .superRefine((data, ctx) => {
    const needsHandler =
      FARMER_ROLES.includes(data.roleId as typeof ROLES.CROP_FARMER) ||
      data.roleId === ROLES.BUYER;
    if (needsHandler && !data.handlerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a handler',
        path: ['handlerId'],
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateHandlerSchema = z.object({
  handlerId: z.string().uuid(),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
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
  role: { roleName: string };
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role.roleName,
    roleId: user.roleId,
    verificationStatus: user.verificationStatus,
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

    const passwordHash = await hashPassword(input.password);

    if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
      const requiredLabel = input.roleId === ROLES.CROP_FARMER ? 'crop' : 'livestock';
      if (!input.commodityIds?.length) {
        throw new AppError(400, `Select at least one ${requiredLabel} commodity`);
      }
      for (const commodityId of input.commodityIds) {
        const commodity = await prisma.commodity.findUnique({
          where: { id: commodityId },
          include: { category: true },
        });
        if (
          !commodity ||
          !categoryMatchesFarmerRole(commodity.category.name, input.roleId, ROLES.CROP_FARMER, ROLES.LIVESTOCK_FARMER)
        ) {
          throw new AppError(400, `Commodity must belong to a ${requiredLabel} category for this farmer role`);
        }
      }
    }

    if (
      input.handlerId &&
      (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER) ||
        input.roleId === ROLES.BUYER)
    ) {
      const handler = assertFound(
        await prisma.user.findUnique({ where: { id: input.handlerId } }),
        'Selected handler not found'
      );
      const expectedFarmer = FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER);
      if (expectedFarmer && !isFarmerHandler(handler.roleId)) {
        throw new AppError(400, 'Selected handler is not a farmer handler');
      }
      if (!expectedFarmer && !isBuyerHandler(handler.roleId)) {
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
        },
        include: { role: true },
      });

      if (FARMER_ROLES.includes(input.roleId as typeof ROLES.CROP_FARMER)) {
        const profile = await tx.farmerProfile.create({
          data: {
            userId: created.id,
            farmName: input.farmName || `${input.firstName}'s Farm`,
            farmSize: input.farmSize,
            experienceYears: input.experienceYears,
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
          input.roleId === ROLES.BUYER)
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

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });

    return {
      user: sanitizeUser(fullUser!),
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
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
      roleId === ROLES.BUYER
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
    };
  }

  async updateAssignedHandler(userId: string, roleId: number, handlerId: string) {
    const relationshipType =
      roleId === ROLES.BUYER
        ? 'BUYER_REPRESENTATIVE'
        : FARMER_ROLES.includes(roleId as typeof ROLES.CROP_FARMER)
          ? 'FARMER_REPRESENTATIVE'
          : null;

    if (!relationshipType) {
      throw new AppError(403, 'Only farmers and buyers can update their handler here');
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

    const existing = await prisma.agentAssignment.findFirst({
      where: { ownerId: userId, relationshipType },
    });

    if (existing) {
      return prisma.agentAssignment.update({
        where: { id: existing.id },
        data: { agentId: handlerId },
        include: { agent: agentSelect },
      });
    }

    return prisma.agentAssignment.create({
      data: {
        agentId: handlerId,
        ownerId: userId,
        relationshipType,
      },
      include: { agent: agentSelect },
    });
  }

  async updateUserProfile(userId: string, data: z.infer<typeof updateUserProfileSchema>) {
    await prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.getProfile(userId);
  }
}

export const authService = new AuthService();
