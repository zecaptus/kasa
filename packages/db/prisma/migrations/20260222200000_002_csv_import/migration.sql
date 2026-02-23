-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNRECONCILED', 'RECONCILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'TRANSPORT', 'HOUSING', 'HEALTH', 'ENTERTAINMENT', 'OTHER');

-- AlterTable: add relations to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dummy_csv_import_placeholder" BOOLEAN;
ALTER TABLE "User" DROP COLUMN IF EXISTS "dummy_csv_import_placeholder";

-- CreateTable ImportSession
CREATE TABLE "ImportSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable ImportedTransaction
CREATE TABLE "ImportedTransaction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountingDate" DATE NOT NULL,
    "valueDate" DATE,
    "label" TEXT NOT NULL,
    "debit" DECIMAL(12,2),
    "credit" DECIMAL(12,2),
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'UNRECONCILED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable ManualExpense
CREATE TABLE "ManualExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable Reconciliation
CREATE TABLE "Reconciliation" (
    "id" TEXT NOT NULL,
    "importedTransactionId" TEXT NOT NULL,
    "manualExpenseId" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "isAutoMatched" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportSession_userId_importedAt_idx" ON "ImportSession"("userId", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedTransaction_userId_accountingDate_label_debit_credit_key"
    ON "ImportedTransaction"("userId", "accountingDate", "label", "debit", "credit");

-- CreateIndex
CREATE INDEX "ImportedTransaction_userId_status_idx" ON "ImportedTransaction"("userId", "status");

-- CreateIndex
CREATE INDEX "ImportedTransaction_sessionId_idx" ON "ImportedTransaction"("sessionId");

-- CreateIndex
CREATE INDEX "ManualExpense_userId_date_idx" ON "ManualExpense"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Reconciliation_importedTransactionId_key" ON "Reconciliation"("importedTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Reconciliation_manualExpenseId_key" ON "Reconciliation"("manualExpenseId");

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualExpense" ADD CONSTRAINT "ManualExpense_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_importedTransactionId_fkey"
    FOREIGN KEY ("importedTransactionId") REFERENCES "ImportedTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_manualExpenseId_fkey"
    FOREIGN KEY ("manualExpenseId") REFERENCES "ManualExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
