-- Safety guard: raise an exception if any ManualExpense still has categoryId = NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "ManualExpense" WHERE "categoryId" IS NULL) THEN
        RAISE EXCEPTION 'Migration 004b aborted: ManualExpense rows have NULL categoryId. Run migration 004a backfill first.';
    END IF;
END $$;

-- AlterTable: make categoryId non-nullable on ManualExpense
ALTER TABLE "ManualExpense"
    ALTER COLUMN "categoryId" SET NOT NULL;

-- AlterTable: drop old category enum column from ManualExpense
ALTER TABLE "ManualExpense" DROP COLUMN "category";

-- DropEnum
DROP TYPE "ExpenseCategory";
