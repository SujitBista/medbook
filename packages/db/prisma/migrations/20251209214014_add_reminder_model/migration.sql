-- CreateEnum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "ReminderType" AS ENUM ('TWENTY_FOUR_HOUR', 'ONE_HOUR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reminderType" "ReminderType" NOT NULL DEFAULT 'TWENTY_FOUR_HOUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminders_appointmentId_key" ON "reminders"("appointmentId");

-- CreateIndex
CREATE INDEX "reminders_scheduledFor_idx" ON "reminders"("scheduledFor");

-- CreateIndex
CREATE INDEX "reminders_appointmentId_idx" ON "reminders"("appointmentId");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
