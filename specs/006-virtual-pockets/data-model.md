# Data Model: 006-virtual-pockets

## Schema Changes

### New Enum: `PocketMovementDir`

```prisma
enum PocketMovementDir {
  ALLOCATION
  WITHDRAWAL
}
```

---

### New Model: `Pocket`

```prisma
model Pocket {
  id           String   @id @default(cuid())
  userId       String
  accountLabel String
  name         String   @db.VarChar(100)
  goalAmount   Decimal  @db.Decimal(12, 2)
  color        String   @default("#94a3b8")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  movements PocketMovement[]

  @@index([userId])
  @@index([userId, accountLabel])
}
```

| Field | Type | Constraint | Purpose |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | FK → User | Owner of the pocket |
| `accountLabel` | `String` | — | Matches `ImportedTransaction.accountLabel`; identifies which account this pocket belongs to |
| `name` | `String` | `@db.VarChar(100)` | Display name; required; max 100 chars |
| `goalAmount` | `Decimal(12,2)` | `> 0` | Savings target |
| `color` | `String` | default `"#94a3b8"` | One of the 6 palette colours |

**Derived field** (computed at query time, not stored):
- `allocatedAmount = SUM(movements WHERE direction='ALLOCATION') - SUM(movements WHERE direction='WITHDRAWAL')`

---

### New Model: `PocketMovement`

```prisma
model PocketMovement {
  id        String             @id @default(cuid())
  pocketId  String
  direction PocketMovementDir
  amount    Decimal            @db.Decimal(12, 2)
  note      String?            @db.VarChar(255)
  date      DateTime           @db.Date
  createdAt DateTime           @default(now())

  pocket Pocket @relation(fields: [pocketId], references: [id], onDelete: Cascade)

  @@index([pocketId])
  @@index([pocketId, date])
}
```

| Field | Type | Constraint | Purpose |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `pocketId` | `String` | FK → Pocket (cascade) | Owning pocket |
| `direction` | `PocketMovementDir` | required | ALLOCATION (money in) or WITHDRAWAL (money out) |
| `amount` | `Decimal(12,2)` | `> 0` | Always positive; direction indicates sign |
| `note` | `String?` | `@db.VarChar(255)` | Optional user annotation |
| `date` | `DateTime` | `@db.Date` | Movement date (user-specified) |

**Cascade**: deleting a Pocket deletes all its PocketMovements.

---

### `User` model — new relations (added to existing)

```prisma
model User {
  // ... existing fields ...
  pockets Pocket[]
}
```

---

## Migration

**File**: `packages/db/prisma/migrations/20260226000000_006_add_pockets/migration.sql`

```sql
-- CreateEnum
CREATE TYPE "PocketMovementDir" AS ENUM ('ALLOCATION', 'WITHDRAWAL');

-- CreateTable: Pocket
CREATE TABLE "Pocket" (
  "id"           TEXT          NOT NULL,
  "userId"       TEXT          NOT NULL,
  "accountLabel" TEXT          NOT NULL,
  "name"         VARCHAR(100)  NOT NULL,
  "goalAmount"   DECIMAL(12,2) NOT NULL,
  "color"        TEXT          NOT NULL DEFAULT '#94a3b8',
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "Pocket_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PocketMovement
CREATE TABLE "PocketMovement" (
  "id"        TEXT                 NOT NULL,
  "pocketId"  TEXT                 NOT NULL,
  "direction" "PocketMovementDir"  NOT NULL,
  "amount"    DECIMAL(12,2)        NOT NULL,
  "note"      VARCHAR(255),
  "date"      DATE                 NOT NULL,
  "createdAt" TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PocketMovement_pkey" PRIMARY KEY ("id")
);

-- FK: Pocket → User
ALTER TABLE "Pocket"
  ADD CONSTRAINT "Pocket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: PocketMovement → Pocket
ALTER TABLE "PocketMovement"
  ADD CONSTRAINT "PocketMovement_pocketId_fkey"
  FOREIGN KEY ("pocketId") REFERENCES "Pocket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Pocket_userId_idx" ON "Pocket"("userId");
CREATE INDEX "Pocket_userId_accountLabel_idx" ON "Pocket"("userId", "accountLabel");
CREATE INDEX "PocketMovement_pocketId_idx" ON "PocketMovement"("pocketId");
CREATE INDEX "PocketMovement_pocketId_date_idx" ON "PocketMovement"("pocketId", "date");
```

---

## Computed DTOs (server-side, not persisted)

### `PocketSummaryDto`
```typescript
interface PocketSummaryDto {
  id: string;
  accountLabel: string;
  name: string;
  goalAmount: number;
  allocatedAmount: number;   // derived: SUM(ALLOCATION) - SUM(WITHDRAWAL)
  progressPct: number;       // min(allocatedAmount / goalAmount * 100, 100)
  color: string;
  createdAt: string;
}
```

### `PocketMovementDto`
```typescript
interface PocketMovementDto {
  id: string;
  direction: 'ALLOCATION' | 'WITHDRAWAL';
  amount: number;
  note: string | null;
  date: string;              // YYYY-MM-DD
  createdAt: string;
}
```

### `PocketDetailDto`
```typescript
interface PocketDetailDto extends PocketSummaryDto {
  movements: PocketMovementDto[];
  nextCursor: string | null;
}
```

---

## Balance Enforcement (FR-006)

When processing a new ALLOCATION, the service computes:

```
accountBalance = SELECT SUM(COALESCE(credit,0)) - SUM(COALESCE(debit,0))
                 FROM ImportedTransaction
                 WHERE userId = $userId AND accountLabel = $accountLabel

totalAllocated = SELECT SUM(
                   CASE WHEN m.direction = 'ALLOCATION' THEN m.amount
                        ELSE -m.amount END
                 )
                 FROM PocketMovement m
                 JOIN Pocket p ON p.id = m.pocketId
                 WHERE p.userId = $userId AND p.accountLabel = $accountLabel

headroom = accountBalance - totalAllocated

IF requestedAmount > headroom → REJECT with error showing headroom
```
