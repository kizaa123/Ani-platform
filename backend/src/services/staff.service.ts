import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError, assertFound } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { normalizePhone, PHONE_VALIDATION_MESSAGE } from '../utils/phone';
import {
  ROLES,
  MANAGEABLE_STAFF_ROLE_IDS,
  STAFF_ROLES,
} from '../constants/roles';

const phoneSchema = z.preprocess(
  normalizePhone,
  z.string().regex(/^\d{10}$/, PHONE_VALIDATION_MESSAGE)
);

const manageableRoleSchema = z.coerce
  .number()
  .int()
  .refine(
    (id): id is (typeof MANAGEABLE_STAFF_ROLE_IDS)[number] =>
      (MANAGEABLE_STAFF_ROLE_IDS as readonly number[]).includes(id),
    { message: 'Invalid staff role' }
  );

export const createStaffSchema = z.object({
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
  phone: phoneSchema,
  password: z.string().min(8),
  roleId: manageableRoleSchema,
});

export const updateStaffSchema = z
  .object({
    firstName: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2).optional()
    ),
    lastName: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().min(2).optional()
    ),
    roleId: manageableRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field is required',
  });

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  roleId: true,
  isActive: true,
  verificationStatus: true,
  createdAt: true,
  role: { select: { id: true, roleName: true } },
} as const;

function formatStaffUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: number;
  isActive: boolean;
  verificationStatus: string;
  createdAt: Date;
  role: { id: number; roleName: string };
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    roleId: user.roleId,
    roleName: user.role.roleName,
    isActive: user.isActive,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt.toISOString(),
  };
}

export class StaffService {
  async listStaff() {
    const users = await prisma.user.findMany({
      where: { roleId: { in: [...STAFF_ROLES] } },
      select: staffSelect,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return users.map(formatStaffUser);
  }

  async createStaff(input: z.infer<typeof createStaffSchema>) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Email already registered');

    assertFound(
      await prisma.role.findUnique({ where: { id: input.roleId } }),
      'Invalid role'
    );

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        country: 'Ghana',
        region: 'Greater Accra',
        city: 'Accra',
        roleId: input.roleId,
        verificationStatus: 'VERIFIED',
        isActive: true,
      },
      select: staffSelect,
    });

    return formatStaffUser(user);
  }

  async updateStaff(
    staffId: string,
    input: z.infer<typeof updateStaffSchema>,
    actorUserId: string
  ) {
    const existing = assertFound(
      await prisma.user.findUnique({ where: { id: staffId } }),
      'Staff member not found'
    );

    if (!(STAFF_ROLES as readonly number[]).includes(existing.roleId)) {
      throw new AppError(400, 'User is not a staff member');
    }

    if (staffId === actorUserId) {
      if (input.isActive === false) {
        throw new AppError(400, 'You cannot deactivate your own account');
      }
      if (input.roleId !== undefined && input.roleId !== existing.roleId) {
        throw new AppError(400, 'You cannot change your own role');
      }
    }

    if (input.isActive === false && existing.roleId === ROLES.ADMIN) {
      const activeAdmins = await prisma.user.count({
        where: { roleId: ROLES.ADMIN, isActive: true, id: { not: staffId } },
      });
      if (activeAdmins === 0) {
        throw new AppError(400, 'Cannot deactivate the last active admin');
      }
    }

    if (input.roleId !== undefined && existing.roleId === ROLES.ADMIN && input.roleId !== ROLES.ADMIN) {
      const activeAdmins = await prisma.user.count({
        where: { roleId: ROLES.ADMIN, isActive: true, id: { not: staffId } },
      });
      if (activeAdmins === 0) {
        throw new AppError(400, 'Cannot change role of the last active admin');
      }
    }

    const user = await prisma.user.update({
      where: { id: staffId },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: staffSelect,
    });

    return formatStaffUser(user);
  }
}

export const staffService = new StaffService();
