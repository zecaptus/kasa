-- Fix dedup_key: add `detail` to uniqueness, use NULLS NOT DISTINCT
-- so that NULL detail values are treated as equal (not as always-distinct).
-- This prevents re-importing the same transaction across overlapping CSV exports.

-- Step 1: Delete duplicates, keeping the oldest row per strict key
-- (accountId, accountingDate, label, detail, debit, credit).
-- PostgreSQL PARTITION BY treats NULLs as equal, so detail=NULL rows
-- are correctly grouped together.
DELETE FROM "ImportedTransaction"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "accountId", "accountingDate", "label", "detail", "debit", "credit"
             ORDER BY "createdAt" ASC
           ) AS rn
    FROM "ImportedTransaction"
  ) subq
  WHERE rn > 1
);

-- Step 2: Drop the old unique index (accountId, date, label, debit, credit)
DROP INDEX IF EXISTS "ImportedTransaction_accountId_accountingDate_label_debit_cred_key";

-- Step 3: Create new unique index adding `detail`, with NULLS NOT DISTINCT
-- so that two rows with detail=NULL (and same other fields) still conflict.
CREATE UNIQUE INDEX "dedup_key"
  ON "ImportedTransaction"("accountId", "accountingDate", "label", "detail", "debit", "credit")
  NULLS NOT DISTINCT;
