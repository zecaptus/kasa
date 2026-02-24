-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "RecurrenceSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "RecurringPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "frequency" "RecurrenceFrequency" NOT NULL,
    "source" "RecurrenceSource" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextOccurrenceDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPattern_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ImportedTransaction" ADD COLUMN "recurringPatternId" TEXT;

-- CreateIndex
CREATE INDEX "RecurringPattern_userId_idx" ON "RecurringPattern"("userId");

-- CreateIndex
CREATE INDEX "RecurringPattern_userId_isActive_idx" ON "RecurringPattern"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ImportedTransaction_recurringPatternId_idx" ON "ImportedTransaction"("recurringPatternId");

-- AddForeignKey
ALTER TABLE "RecurringPattern" ADD CONSTRAINT "RecurringPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_recurringPatternId_fkey" FOREIGN KEY ("recurringPatternId") REFERENCES "RecurringPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
