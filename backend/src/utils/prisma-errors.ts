import { Prisma } from '@prisma/client';
import { AppError } from './errors';

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(
      503,
      'Service temporarily unavailable. Please try again later.',
      'DB_UNAVAILABLE'
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021' || error.code === 'P2022') {
      return new AppError(503, 'Service temporarily unavailable. Please try again later.', 'DB_NOT_SETUP');
    }
    if (error.code === 'P2002') {
      return new AppError(409, 'An account with this email already exists', 'DUPLICATE');
    }
    if (error.code === 'P2003') {
      return new AppError(
        409,
        'This record cannot be removed because it is linked to existing data',
        'FK_CONSTRAINT'
      );
    }
    if (error.code === 'P2010' || error.code === 'P2011') {
      return new AppError(503, 'Service temporarily unavailable. Please try again later.', 'DB_NOT_SETUP');
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(503, 'Service temporarily unavailable. Please try again later.', 'DB_SCHEMA_OUTDATED');
  }

  return new AppError(500, 'Internal server error', 'INTERNAL_ERROR');
}
