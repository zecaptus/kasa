-- CreateEnum
CREATE TYPE "PocketMovementDir" AS ENUM ('ALLOCATION', 'WITHDRAWAL');

-- CreateTable: Pocket
CREATE TABLE "Pocket" (
    "id"          TEXT          NOT NULL,
    "userId"      TEXT          NOT NULL,
    "accountId"   TEXT          NOT NULL,
    "name"        VARCHAR(100)  NOT NULL,
    "goalAmount"  DECIMAL(12,2) NOT NULL,
    "color"       TEXT          NOT NULL DEFAULT '#94a3b8',
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "Pocket_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PocketMovement
CREATE TABLE "PocketMovement" (
    "id"        TEXT                NOT NULL,
    "pocketId"  TEXT                NOT NULL,
    "direction" "PocketMovementDir" NOT NULL,
    "amount"    DECIMAL(12,2)       NOT NULL,
    "note"      VARCHAR(255),
    "date"      DATE                NOT NULL,
    "createdAt" TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PocketMovement_pkey" PRIMARY KEY ("id")
);

-- FK: Pocket → User
ALTER TABLE "Pocket"
    ADD CONSTRAINT "Pocket_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: Pocket → Account
ALTER TABLE "Pocket"
    ADD CONSTRAINT "Pocket_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: PocketMovement → Pocket
ALTER TABLE "PocketMovement"
    ADD CONSTRAINT "PocketMovement_pocketId_fkey"
    FOREIGN KEY ("pocketId") REFERENCES "Pocket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Pocket_userId_idx" ON "Pocket"("userId");
CREATE INDEX "Pocket_accountId_idx" ON "Pocket"("accountId");
CREATE INDEX "PocketMovement_pocketId_idx" ON "PocketMovement"("pocketId");
CREATE INDEX "PocketMovement_pocketId_date_idx" ON "PocketMovement"("pocketId", "date");
