-- Add lastKnownBalance and lastKnownBalanceDate to Account
ALTER TABLE "Account" ADD COLUMN "lastKnownBalance" DECIMAL(12,2);
ALTER TABLE "Account" ADD COLUMN "lastKnownBalanceDate" DATE;
