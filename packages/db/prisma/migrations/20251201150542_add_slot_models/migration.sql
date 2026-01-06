-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "slot_templates" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "availabilityId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slot_templates_doctorId_key" ON "slot_templates"("doctorId");

-- CreateIndex
CREATE INDEX "slots_doctorId_idx" ON "slots"("doctorId");

-- CreateIndex
CREATE INDEX "slots_startTime_idx" ON "slots"("startTime");

-- CreateIndex
CREATE INDEX "slots_endTime_idx" ON "slots"("endTime");

-- CreateIndex
CREATE INDEX "slots_status_idx" ON "slots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "slots_doctorId_startTime_endTime_key" ON "slots"("doctorId", "startTime", "endTime");

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "slotId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_slotId_key" ON "appointments"("slotId");

-- AddForeignKey
ALTER TABLE "slot_templates" ADD CONSTRAINT "slot_templates_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "availabilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;











