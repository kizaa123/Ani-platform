import { AuthRequest } from './auth.middleware';
import prisma from '../database/prisma';

export async function createAuditLog(
  req: AuthRequest,
  action: string,
  resource?: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action,
        resource,
        details: details ?? undefined,
        ipAddress: req.ip,
      },
    });
  } catch {
    // Non-blocking
  }
}
