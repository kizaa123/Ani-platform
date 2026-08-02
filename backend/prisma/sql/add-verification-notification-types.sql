-- Run when verification notifications fail with invalid enum value.
-- Prefer: npm run db:push (from backend/) which syncs the full schema.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'USER_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERNATIONAL_VERIFICATION';
