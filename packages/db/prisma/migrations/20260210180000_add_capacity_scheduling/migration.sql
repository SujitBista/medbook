-- CreateEnum
CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'CASH', 'ESEWA');

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "AppointmentStatus" ADD VALUE 'OVERFLOW';

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxPatients" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "scheduleId" TEXT,
ADD COLUMN "paymentStatus" "AppointmentPaymentStatus" DEFAULT 'UNPAID',
ADD COLUMN "paymentProvider" "PaymentProvider",
ADD COLUMN "paymentIntentId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "queueNumber" INTEGER;

-- CreateIndex
CREATE INDEX "schedules_doctorId_idx" ON "schedules"("doctorId");
CREATE INDEX "schedules_doctorId_date_idx" ON "schedules"("doctorId", "date");
CREATE UNIQUE INDEX "schedules_doctorId_date_startTime_endTime_key" ON "schedules"("doctorId", "date", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_paymentIntentId_key" ON "appointments"("paymentIntentId");
CREATE INDEX "appointments_scheduleId_idx" ON "appointments"("scheduleId");
CREATE INDEX "appointments_paymentStatus_idx" ON "appointments"("paymentStatus");
CREATE INDEX "appointments_paymentIntentId_idx" ON "appointments"("paymentIntentId");

-- Unique (scheduleId, queueNumber): PostgreSQL allows multiple NULLs in unique, so PENDING_PAYMENT/OVERFLOW rows (queueNumber NULL) don't conflict
CREATE UNIQUE INDEX "appointments_scheduleId_queueNumber_key" ON "appointments"("scheduleId", "queueNumber");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
