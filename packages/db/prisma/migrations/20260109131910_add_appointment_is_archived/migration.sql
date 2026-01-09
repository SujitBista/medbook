-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "appointments_isArchived_idx" ON "appointments"("isArchived");

-- CreateIndex
CREATE INDEX "appointments_endTime_isArchived_idx" ON "appointments"("endTime", "isArchived");
