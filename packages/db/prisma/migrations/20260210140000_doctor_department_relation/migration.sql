-- Add isActive to departments
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add departmentId to doctors
ALTER TABLE "doctors" ADD COLUMN "departmentId" TEXT;

-- Create departments from distinct doctor specializations (slug = lowercase, hyphenated)
INSERT INTO "departments" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  sub.spec,
  sub.slug,
  true,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT ON (slug) spec, slug
  FROM (
    SELECT
      TRIM("specialization") AS spec,
      TRIM(BOTH '-' FROM REGEXP_REPLACE(REGEXP_REPLACE(LOWER(REGEXP_REPLACE(TRIM("specialization"), '\s+', '-', 'g')), '[^a-z0-9-]', '', 'g'), '-+', '-', 'g')) AS slug
    FROM "doctors"
    WHERE "specialization" IS NOT NULL AND TRIM("specialization") != ''
  ) inner_sub
  WHERE inner_sub.slug != ''
  ORDER BY slug, spec
) sub
WHERE sub.slug != ''
  AND NOT EXISTS (SELECT 1 FROM "departments" d WHERE d.slug = sub.slug);

-- Backfill doctor.departmentId from specialization (match by slug)
UPDATE "doctors" d
SET "departmentId" = dep.id
FROM "departments" dep
WHERE dep.slug = TRIM(BOTH '-' FROM REGEXP_REPLACE(REGEXP_REPLACE(LOWER(REGEXP_REPLACE(TRIM(d."specialization"), '\s+', '-', 'g')), '[^a-z0-9-]', '', 'g'), '-+', '-', 'g'))
  AND d."specialization" IS NOT NULL
  AND TRIM(d."specialization") != '';

-- Add foreign key and index
CREATE INDEX "doctors_departmentId_idx" ON "doctors"("departmentId");
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
