-- AlterTable
ALTER TABLE "ImportedTransaction"
  ADD COLUMN "categoryRuleId" TEXT;

-- AddForeignKey
ALTER TABLE "ImportedTransaction"
  ADD CONSTRAINT "ImportedTransaction_categoryRuleId_fkey"
  FOREIGN KEY ("categoryRuleId") REFERENCES "CategoryRule"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ImportedTransaction_categoryRuleId_idx"
  ON "ImportedTransaction"("categoryRuleId");
