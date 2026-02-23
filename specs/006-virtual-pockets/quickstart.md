# Quickstart: 006-virtual-pockets

## Prerequisites

- Phase 4 (005-dashboard) merged to `main` ✓
- `pnpm install` run at repo root
- PostgreSQL 16 running, `DATABASE_URL` set in `.env`

---

## Step 1 — Apply the Migration

```bash
pnpm --filter @kasa/db run db:migrate
pnpm --filter @kasa/db run db:generate
```

Migration adds:
- Enum `PocketMovementDir` (`ALLOCATION | WITHDRAWAL`)
- Table `Pocket` (id, userId, accountLabel, name, goalAmount, color, createdAt, updatedAt)
- Table `PocketMovement` (id, pocketId, direction, amount, note, date, createdAt)

**Verify**:
```bash
psql $DATABASE_URL -c "\d \"Pocket\""
psql $DATABASE_URL -c "\d \"PocketMovement\""
```

---

## Step 2 — Start Dev Server

```bash
pnpm dev
```
Frontend: `http://localhost:5173/` | Backend: `http://localhost:3000/`

---

## Step 3 — Verify the Pockets API

```bash
# Authenticate
curl -s -c /tmp/kasa.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@kasa.app","password":"Test1234!"}' | jq .

# List pockets (empty initially)
curl -s -b /tmp/kasa.txt http://localhost:3000/api/pockets | jq .
# Expected: { "pockets": [] }

# Create a pocket
curl -s -b /tmp/kasa.txt -X POST http://localhost:3000/api/pockets \
  -H "Content-Type: application/json" \
  -d '{"accountLabel":"Livret A","name":"Vacances","goalAmount":2000,"color":"#3b82f6"}' | jq .

# Allocate €500
POCKET_ID=$(curl -s -b /tmp/kasa.txt http://localhost:3000/api/pockets | jq -r '.pockets[0].id')
curl -s -b /tmp/kasa.txt -X POST http://localhost:3000/api/pockets/$POCKET_ID/movements \
  -H "Content-Type: application/json" \
  -d '{"direction":"ALLOCATION","amount":500,"date":"2026-02-23","note":"Premier versement"}' | jq .
# Expected: pocket with allocatedAmount=500, progressPct=25

# Try over-allocating (should fail with 422 if account balance < total)
curl -s -b /tmp/kasa.txt -X POST http://localhost:3000/api/pockets/$POCKET_ID/movements \
  -H "Content-Type: application/json" \
  -d '{"direction":"ALLOCATION","amount":999999,"date":"2026-02-23"}' | jq .
# Expected: { "error": "INSUFFICIENT_HEADROOM", "message": "Maximum allocatable amount is ..." }

# List pockets (updated)
curl -s -b /tmp/kasa.txt http://localhost:3000/api/pockets | jq .

# Get pocket detail with movements
curl -s -b /tmp/kasa.txt http://localhost:3000/api/pockets/$POCKET_ID | jq .
```

---

## Step 4 — Verify the Frontend

1. Navigate to `http://localhost:5173/cagnottes` — Pockets management page.
   - Should show the "Vacances" pocket with progress bar at 25 %.
   - "New pocket" button opens creation form.

2. Navigate to `http://localhost:5173/` (Dashboard).
   - Under the "Livret A" account card, the "Vacances" pocket card should appear nested.
   - Pocket card shows name, allocated amount, progress bar.

3. On mobile (DevTools → 375 px):
   - Pocket cards stack below the account card without horizontal overflow.

---

## Step 5 — Run Tests

```bash
pnpm test
```

Coverage ≥ 80% per new module. Key modules:

| Module | What is tested |
|---|---|
| `backend/src/services/pockets.service.ts` | CRUD, balance check, movement aggregation |
| `backend/src/routes/pockets.router.ts` | All 7 endpoints + auth + error cases |
| `frontend/src/services/pocketsApi.ts` | RTK Query endpoint shapes |
| `frontend/src/components/PocketCard.tsx` | Progress bar, goal achievement, colours |
| `frontend/src/pages/PocketsPage.tsx` | Create/edit/delete flows |

---

## Step 6 — Validate Balance Enforcement

```bash
# Seed two pockets for the same account
curl -s -b /tmp/kasa.txt -X POST http://localhost:3000/api/pockets \
  -H "Content-Type: application/json" \
  -d '{"accountLabel":"Livret A","name":"Voiture","goalAmount":5000,"color":"#22c55e"}' | jq .

# Allocate most of the available headroom to the second pocket
POCKET2=$(curl -s -b /tmp/kasa.txt http://localhost:3000/api/pockets | jq -r '.pockets[1].id')
# Compute available headroom first, then allocate close to limit
# Then try to allocate to pocket 1 an amount that would exceed total
# Expect 422 INSUFFICIENT_HEADROOM
```
