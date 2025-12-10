-- Update any existing NULL values to default values before making columns NOT NULL
-- For firstName and lastName, use a placeholder if NULL
-- Only update if columns exist (using pg_attribute for accurate case-sensitive check)
DO $$
BEGIN
  -- Check and update firstName if column exists
  IF EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = 'users'::regclass 
    AND attname = 'firstName' 
    AND NOT attisdropped
  ) THEN
    UPDATE "users" SET "firstName" = 'User' WHERE "firstName" IS NULL;
  END IF;

  -- Check and update lastName if column exists
  IF EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = 'users'::regclass 
    AND attname = 'lastName' 
    AND NOT attisdropped
  ) THEN
    UPDATE "users" SET "lastName" = 'Name' WHERE "lastName" IS NULL;
  END IF;

  -- Check and update phoneNumber if column exists
  IF EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = 'users'::regclass 
    AND attname = 'phoneNumber' 
    AND NOT attisdropped
  ) THEN
    UPDATE "users" SET "phoneNumber" = '000-000-0000' WHERE "phoneNumber" IS NULL;
  END IF;
END $$;

-- AlterTable: Make firstName, lastName, and phoneNumber required (NOT NULL)
-- Only alter if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = 'users'::regclass 
    AND attname = 'firstName' 
    AND NOT attisdropped
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "firstName" SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = 'users'::regclass 
    AND attname = 'lastName' 
    AND NOT attisdropped
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "lastName" SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = 'users'::regclass 
    AND attname = 'phoneNumber' 
    AND NOT attisdropped
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "phoneNumber" SET NOT NULL;
  END IF;
END $$;
