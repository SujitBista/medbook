-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');

-- AlterTable: appointments - add cancellation audit fields
ALTER TABLE "appointments" ADD COLUMN "cancelledBy" "CancelledBy",
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT;

-- AlterEnum: AppointmentStatus - add BOOKED and NO_SHOW
ALTER TYPE "AppointmentStatus" ADD VALUE 'BOOKED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';

-- AlterTable: payments - add refund audit fields
ALTER TABLE "payments" ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "refundId" TEXT,
ADD COLUMN "refundAmount" INTEGER;

-- AlterEnum: PaymentStatus - add PAID, REFUND_PENDING, REFUND_FAILED
ALTER TYPE "PaymentStatus" ADD VALUE 'PAID';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_FAILED';
