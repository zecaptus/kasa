-- AddColumn: accountLabel on ImportedTransaction
-- Migration 005: add accountLabel to track which bank account a transaction belongs to.
-- Populated at CSV import time from the SG CSV pre-header (Libellé du compte).
-- Existing rows receive empty string default and are displayed as "Compte principal".

ALTER TABLE "ImportedTransaction" ADD COLUMN "accountLabel" TEXT NOT NULL DEFAULT '';
