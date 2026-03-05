-- Migration A: Add RecurringRule and RecurringPendingMatch tables (additive)
-- Also adds recurringRuleId column to ImportedTransaction and migrates existing data.

-- CreateTable RecurringRule
CREATE TABLE "RecurringRule" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "label"        TEXT NOT NULL,
  "keyword"      TEXT NOT NULL,
  "periodMonths" INTEGER NOT NULL,
  "anchorDate"   DATE NOT NULL,
  "amount"       DECIMAL(12,2),
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable RecurringPendingMatch
CREATE TABLE "RecurringPendingMatch" (
  "id"            TEXT NOT NULL,
  "ruleId"        TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "score"         DOUBLE PRECISION NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringPendingMatch_pkey" PRIMARY KEY ("id")
);

-- AddColumn recurringRuleId to ImportedTransaction
ALTER TABLE "ImportedTransaction" ADD COLUMN "recurringRuleId" TEXT;

-- CreateIndex
CREATE INDEX "RecurringRule_userId_idx" ON "RecurringRule"("userId");
CREATE INDEX "RecurringRule_userId_isActive_idx" ON "RecurringRule"("userId", "isActive");
CREATE UNIQUE INDEX "RecurringPendingMatch_transactionId_key" ON "RecurringPendingMatch"("transactionId");
CREATE INDEX "RecurringPendingMatch_ruleId_idx" ON "RecurringPendingMatch"("ruleId");
CREATE INDEX "ImportedTransaction_recurringRuleId_idx" ON "ImportedTransaction"("recurringRuleId");

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringPendingMatch" ADD CONSTRAINT "RecurringPendingMatch_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "RecurringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringPendingMatch" ADD CONSTRAINT "RecurringPendingMatch_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "ImportedTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_recurringRuleId_fkey"
  FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: Copy RecurringPattern → RecurringRule
INSERT INTO "RecurringRule" ("id", "userId", "label", "keyword", "periodMonths", "anchorDate", "amount", "isActive", "createdAt", "updatedAt")
SELECT
  rp."id",
  rp."userId",
  rp."label",
  rp."keyword",
  CASE rp."frequency"
    WHEN 'MONTHLY' THEN 1
    WHEN 'ANNUAL'  THEN 12
    WHEN 'WEEKLY'  THEN 1
    ELSE 1
  END,
  COALESCE(
    (SELECT it."accountingDate"
     FROM "ImportedTransaction" it
     WHERE it."recurringPatternId" = rp.id
     ORDER BY it."accountingDate" DESC
     LIMIT 1),
    CURRENT_DATE
  ),
  rp."amount",
  rp."isActive",
  rp."createdAt",
  rp."updatedAt"
FROM "RecurringPattern" rp
ON CONFLICT DO NOTHING;

-- DataMigration: Link ImportedTransaction rows to new RecurringRule
UPDATE "ImportedTransaction"
SET "recurringRuleId" = "recurringPatternId"
WHERE "recurringPatternId" IS NOT NULL;
