-- Add transferPeerId to ImportedTransaction for linking internal transfer pairs
ALTER TABLE "ImportedTransaction" ADD COLUMN "transferPeerId" TEXT;

-- AddForeignKey (self-referential, SET NULL on delete)
ALTER TABLE "ImportedTransaction"
  ADD CONSTRAINT "ImportedTransaction_transferPeerId_fkey"
  FOREIGN KEY ("transferPeerId") REFERENCES "ImportedTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ImportedTransaction_transferPeerId_idx" ON "ImportedTransaction"("transferPeerId");
