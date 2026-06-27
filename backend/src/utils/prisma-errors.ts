import { Prisma } from '@prisma/client';
import { AppError } from './errors';

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(
      503,
      'Database unavailable. Run: npm run db:setup',
      'DB_UNAVAILABLE'
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021' || error.code === 'P2022') {
      return new AppError(503, 'Database not set up. Run: npm run db:setup', 'DB_NOT_SETUP');
    }
  }

  return new AppError(500, 'Internal server error', 'INTERNAL_ERROR');
}
