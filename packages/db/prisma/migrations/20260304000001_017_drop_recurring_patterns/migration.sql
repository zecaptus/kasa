-- Migration B: Drop legacy RecurringPattern table and related columns/enums.
-- Apply only after Migration A has been validated.

-- DropForeignKey
ALTER TABLE "ImportedTransaction" DROP CONSTRAINT IF EXISTS "ImportedTransaction_recurringPatternId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "ImportedTransaction_recurringPatternId_idx";

-- DropColumn
ALTER TABLE "ImportedTransaction" DROP COLUMN IF EXISTS "recurringPatternId";

-- DropTable
DROP TABLE IF EXISTS "RecurringPattern";

-- DropEnum
DROP TYPE IF EXISTS "RecurrenceFrequency";
DROP TYPE IF EXISTS "RecurrenceSource";
