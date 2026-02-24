-- CreateTable Account
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable AccountViewer
CREATE TABLE "AccountViewer" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountViewer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountViewer" ADD CONSTRAINT "AccountViewer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountViewer" ADD CONSTRAINT "AccountViewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Account_ownerId_accountNumber_key" ON "Account"("ownerId", "accountNumber");

-- CreateIndex
CREATE INDEX "Account_ownerId_idx" ON "Account"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountViewer_accountId_userId_key" ON "AccountViewer"("accountId", "userId");

-- CreateIndex
CREATE INDEX "AccountViewer_userId_idx" ON "AccountViewer"("userId");

-- Migrate existing data: create Account entries from ImportSession
INSERT INTO "Account" ("id", "accountNumber", "label", "ownerId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    COALESCE("accountNumber", 'UNKNOWN'),
    COALESCE("accountNumber", 'Compte inconnu'),
    "userId",
    MIN("importedAt"),
    CURRENT_TIMESTAMP
FROM "ImportSession"
WHERE "accountNumber" IS NOT NULL
GROUP BY "userId", "accountNumber"
ON CONFLICT DO NOTHING;

-- Add accountId column to ImportSession (nullable first)
ALTER TABLE "ImportSession" ADD COLUMN "accountId" TEXT;

-- Populate accountId in ImportSession
UPDATE "ImportSession" s
SET "accountId" = a."id"
FROM "Account" a
WHERE a."ownerId" = s."userId"
  AND a."accountNumber" = COALESCE(s."accountNumber", 'UNKNOWN');

-- Make accountId required
ALTER TABLE "ImportSession" ALTER COLUMN "accountId" SET NOT NULL;

-- Add accountId column to ImportedTransaction (nullable first)
ALTER TABLE "ImportedTransaction" ADD COLUMN "accountId" TEXT;

-- Populate accountId in ImportedTransaction via ImportSession
UPDATE "ImportedTransaction" t
SET "accountId" = s."accountId"
FROM "ImportSession" s
WHERE t."sessionId" = s."id";

-- Make accountId required
ALTER TABLE "ImportedTransaction" ALTER COLUMN "accountId" SET NOT NULL;

-- Drop old unique constraint on ImportedTransaction
ALTER TABLE "ImportedTransaction" DROP CONSTRAINT IF EXISTS "ImportedTransaction_userId_accountingDate_label_debit_credi_key";
ALTER TABLE "ImportedTransaction" DROP CONSTRAINT IF EXISTS "dedup_key";

-- Create new unique constraint with accountId
CREATE UNIQUE INDEX "ImportedTransaction_accountId_accountingDate_label_debit_cred_key" ON "ImportedTransaction"("accountId", "accountingDate", "label", "debit", "credit");

-- Add index for accountId
CREATE INDEX "ImportedTransaction_accountId_idx" ON "ImportedTransaction"("accountId");

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ImportSession_accountId_idx" ON "ImportSession"("accountId");

-- Drop accountLabel from ImportedTransaction
ALTER TABLE "ImportedTransaction" DROP COLUMN IF EXISTS "accountLabel";

-- Drop accountNumber from ImportSession (data migrated to Account)
ALTER TABLE "ImportSession" DROP COLUMN IF EXISTS "accountNumber";

-- (Pocket migration deferred to 20260226000000_006_add_pockets which creates the table)
