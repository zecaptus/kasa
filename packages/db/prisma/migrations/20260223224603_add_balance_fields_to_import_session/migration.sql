-- AlterTable
ALTER TABLE "ImportSession" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "balance" DECIMAL(12,2),
ADD COLUMN     "balanceDate" DATE,
ADD COLUMN     "currency" VARCHAR(3),
ADD COLUMN     "exportEndDate" DATE,
ADD COLUMN     "exportStartDate" DATE,
ADD COLUMN     "transactionCount" INTEGER;
