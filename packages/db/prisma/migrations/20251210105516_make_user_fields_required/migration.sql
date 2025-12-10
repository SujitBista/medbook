-- Update any existing NULL values to default values before making columns NOT NULL
-- For firstName and lastName, use a placeholder if NULL
UPDATE "users" SET "firstName" = 'User' WHERE "firstName" IS NULL;
UPDATE "users" SET "lastName" = 'Name' WHERE "lastName" IS NULL;
UPDATE "users" SET "phoneNumber" = '000-000-0000' WHERE "phoneNumber" IS NULL;

-- AlterTable: Make firstName, lastName, and phoneNumber required (NOT NULL)
ALTER TABLE "users" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "lastName" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "phoneNumber" SET NOT NULL;
