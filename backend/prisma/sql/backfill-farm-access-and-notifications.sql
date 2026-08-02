-- Safe manual migration for Neon / Render PostgreSQL (no data loss).
-- Run BEFORE or AFTER `prisma db push` if deploy fails on existing rows.
--
-- Usage (Neon SQL editor or psql):
--   psql "$DATABASE_URL" -f backend/prisma/sql/backfill-farm-access-and-notifications.sql

-- ── FarmerProfile: farm access cycle (nullable add + backfill) ───────────────
ALTER TABLE farmer_profile
  ADD COLUMN IF NOT EXISTS farm_access_cycle_id TEXT;

UPDATE farmer_profile
SET farm_access_cycle_id = gen_random_uuid()::text
WHERE farm_access_cycle_id IS NULL;

-- ── BuyerFarmerAccess: harvest-window fields (nullable; safe on existing rows) ─
ALTER TABLE buyer_farmer_access
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP(3);

ALTER TABLE buyer_farmer_access
  ADD COLUMN IF NOT EXISTS access_cycle_id TEXT;

-- ── NotificationType enum extensions ───────────────────────────────────────
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'USER_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERNATIONAL_VERIFICATION';
