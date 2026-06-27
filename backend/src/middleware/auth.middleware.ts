import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import prisma from '../database/prisma';

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
