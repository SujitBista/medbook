-- Add stripeAccountId to doctors if missing (idempotent fix for production
-- where 20260119120000_add_payment_commission_models may not have applied
-- or the column was not created).
-- Safe to run: IF NOT EXISTS ensures no error when column already exists.
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
