-- CreateEnum
CREATE TYPE "CategorySource" AS ENUM ('NONE', 'AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "Category" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "color"     TEXT NOT NULL DEFAULT '#94a3b8',
    "isSystem"  BOOLEAN NOT NULL DEFAULT false,
    "userId"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRule" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT,
    "keyword"    VARCHAR(100) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isSystem"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryRule_pkey" PRIMARY KEY ("id")
);

-- Seed system categories (fixed IDs for stable backfill mapping)
INSERT INTO "Category" ("id", "name", "slug", "color", "isSystem", "userId") VALUES
  ('cat_system_food',          'Alimentation', 'food',          '#22c55e', true, NULL),
  ('cat_system_transport',     'Transport',    'transport',     '#3b82f6', true, NULL),
  ('cat_system_housing',       'Logement',     'housing',       '#f59e0b', true, NULL),
  ('cat_system_health',        'Santé',        'health',        '#ec4899', true, NULL),
  ('cat_system_entertainment', 'Loisirs',      'entertainment', '#8b5cf6', true, NULL),
  ('cat_system_other',         'Autre',        'other',         '#94a3b8', true, NULL);

-- AlterTable ImportedTransaction: add categoryId + categorySource
ALTER TABLE "ImportedTransaction"
    ADD COLUMN "categoryId"     TEXT,
    ADD COLUMN "categorySource" "CategorySource" NOT NULL DEFAULT 'NONE';

-- AlterTable ManualExpense: add categoryId + categorySource
ALTER TABLE "ManualExpense"
    ADD COLUMN "categoryId"     TEXT,
    ADD COLUMN "categorySource" "CategorySource" NOT NULL DEFAULT 'NONE';

-- AddForeignKey Category → User
ALTER TABLE "Category"
    ADD CONSTRAINT "Category_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey CategoryRule → User
ALTER TABLE "CategoryRule"
    ADD CONSTRAINT "CategoryRule_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey CategoryRule → Category
ALTER TABLE "CategoryRule"
    ADD CONSTRAINT "CategoryRule_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ImportedTransaction → Category
ALTER TABLE "ImportedTransaction"
    ADD CONSTRAINT "ImportedTransaction_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey ManualExpense → Category
ALTER TABLE "ManualExpense"
    ADD CONSTRAINT "ManualExpense_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill ManualExpense.categoryId from the old category enum column
UPDATE "ManualExpense" me
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."isSystem" = true
  AND c."slug" = LOWER(me."category"::text)
  AND me."categoryId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_userId_key" ON "Category"("slug", "userId") NULLS NOT DISTINCT;
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE INDEX "CategoryRule_userId_idx" ON "CategoryRule"("userId");
CREATE INDEX "CategoryRule_isSystem_idx" ON "CategoryRule"("isSystem");
CREATE INDEX "ImportedTransaction_categoryId_idx" ON "ImportedTransaction"("categoryId");
CREATE INDEX "ManualExpense_categoryId_idx" ON "ManualExpense"("categoryId");
