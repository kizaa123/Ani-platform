import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import prisma from '../database/prisma';
import { canPurchaseFromMarketplace, isAccountantRole, isAccountantApproved } from '../constants/roles';

export interface AuthRequest extends Request {
  user?: TokenPayload & { permissions: string[] };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const payload = verifyAccessToken(authHeader.split(' ')[1]);
    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: payload.roleId },
      include: { permission: true },
    });

    req.user = {
      ...payload,
      permissions: permissions.map((rp) => rp.permission.permissionName),
    };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requirePermission(...required: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const has = required.some((p) => req.user!.permissions.includes(p));
    if (!has) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireRole(...roleIds: number[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roleIds.includes(req.user.roleId)) {
      return res.status(403).json({ success: false, error: 'Role not authorized' });
    }
    next();
  };
}

/** Blocks self-registered accountants until an admin sets verificationStatus to VERIFIED. */
export async function requireApprovedAccountant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!isAccountantRole(req.user.roleId)) {
    return next();
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { verificationStatus: true },
  });
  if (!user || !isAccountantApproved(user.verificationStatus)) {
    return res.status(403).json({
      success: false,
      error: 'Awaiting admin approval',
      code: 'ACCOUNTANT_PENDING_APPROVAL',
    });
  }
  next();
}

/** Buyers, researchers, and farmers who browse/purchase from other farms on the marketplace. */
export function requireCanPurchaseFromMarketplace() {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!canPurchaseFromMarketplace(req.user.roleId)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}
