-- CreateTable
CREATE TABLE "TransferLabelRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "keyword" VARCHAR(100) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferLabelRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferLabelRule_userId_idx" ON "TransferLabelRule"("userId");

-- AlterTable
ALTER TABLE "ImportedTransaction" ADD COLUMN "transferLabel" VARCHAR(100),
ADD COLUMN "transferLabelRuleId" TEXT;

-- CreateIndex
CREATE INDEX "ImportedTransaction_transferLabelRuleId_idx" ON "ImportedTransaction"("transferLabelRuleId");

-- AddForeignKey
ALTER TABLE "TransferLabelRule" ADD CONSTRAINT "TransferLabelRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_transferLabelRuleId_fkey" FOREIGN KEY ("transferLabelRuleId") REFERENCES "TransferLabelRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
