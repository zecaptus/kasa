# Quickstart: User Management (002)

**Date**: 2026-02-22 | **Branch**: `002-user-management`

Guide de démarrage rapide pour implémenter et tester cette feature en local.

---

## Prérequis

```bash
# Depuis la racine du repo
pnpm install          # installe toutes les dépendances workspace

# Vérifier que PostgreSQL tourne
psql -U postgres -c "SELECT 1"

# Vérifier les variables d'environnement backend
cp backend/.env.example backend/.env   # puis éditer
```

**Variables requises** dans `backend/.env` :
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kasa_dev"
JWT_SECRET="your-secret-min-32-chars-here"
JWT_ACCESS_EXPIRES="15m"
REFRESH_TOKEN_TTL_DAYS="7"
NODE_ENV="development"
```

---

## Setup base de données

```bash
# Appliquer le schéma Prisma (inclut les nouvelles tables User + RefreshToken)
pnpm --filter @kasa/db run db:migrate

# Vérifier la migration
pnpm --filter @kasa/db run db:generate
```

---

## Démarrage en développement

```bash
# Terminal 1 — backend sur :3000
pnpm --filter @kasa/backend dev

# Terminal 2 — frontend sur :5173 (proxy /api → :3000 configuré dans vite.config.ts)
pnpm --filter @kasa/frontend dev
```

Le proxy Vite est configuré dans `frontend/vite.config.ts` :
- `GET /api/auth/me` → `http://localhost:3000/api/auth/me`
- `POST /api/auth/login` → `http://localhost:3000/api/auth/login`
- etc.

Les cookies `httpOnly + SameSite=Strict` fonctionnent car le navigateur voit un seul `localhost:5173`.

---

## Tester les endpoints manuellement

```bash
# Inscription
curl -c cookies.txt -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"monPass123","name":"Test User"}'

# Connexion
curl -c cookies.txt -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"monPass123"}'

# Profil courant
curl -b cookies.txt http://localhost:5173/api/auth/me

# Mise à jour profil
curl -b cookies.txt -X PATCH http://localhost:5173/api/auth/me \
  -H "Content-Type: application/json" \
  -d '{"name":"Nouveau Nom","locale":"EN"}'

# Déconnexion
curl -b cookies.txt -X POST http://localhost:5173/api/auth/logout
```

---

## Lancer les tests

```bash
# Tous les tests (unit + integration)
pnpm test

# Backend uniquement
pnpm --filter @kasa/backend test

# Frontend uniquement
pnpm --filter @kasa/frontend test

# Avec couverture
pnpm --filter @kasa/backend test --coverage
pnpm --filter @kasa/frontend test --coverage
```

**Cible couverture** : ≥ 80% par module (statements, branches, functions, lines).

---

## Structure des fichiers créés par cette feature

```text
# Backend
backend/src/
├── routes/
│   ├── auth.router.ts          # POST /api/auth/{register,login,logout,refresh} + GET /api/auth/me
│   └── account.router.ts       # PATCH /api/account/profile
├── middleware/
│   └── auth.ts                 # requireAuth → ctx.state.user: AuthenticatedUser
├── services/
│   ├── auth.service.ts         # register, login, logout, refresh (Argon2id + JWT + cookies)
│   └── account.service.ts      # updateProfile
└── types/
    └── koa.d.ts                # declare module 'koa' { DefaultState.user }

backend/tests/
├── unit/services/
│   └── auth.service.test.ts    # hash, verify, lockout logic
└── integration/
    └── auth.test.ts            # supertest — register, login, logout, refresh, me, lockout

# Frontend
frontend/src/
├── services/
│   ├── api.ts                  # fetchBaseQuery({ credentials: 'include' })
│   ├── baseQueryWithReauth.ts  # mutex-guarded 401 → refresh → retry
│   └── authApi.ts              # RTK Query endpoints (login, register, logout, me, updateProfile)
├── store/
│   ├── authSlice.ts            # user, isAuthenticated, isInitialized
│   └── index.ts                # configureStore
├── components/
│   └── ProtectedRoute.tsx      # <Outlet> + Redux selector
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx        # + PasswordStrengthIndicator
│   └── ProfilePage.tsx
├── lib/
│   └── passwordStrength.ts     # score 0-4, labels i18n-ready
└── i18n/
    ├── fr.json                 # auth.login.*, auth.register.*, auth.profile.*
    └── en.json

frontend/tests/
├── unit/
│   ├── lib/passwordStrength.test.ts
│   └── store/authSlice.test.ts
└── integration/
    └── auth.test.tsx           # ProtectedRoute + form flows

# Racine repo
api/
└── index.ts                    # Vercel serverless shim → re-export app.callback()

vercel.json                     # Corrigé : /api/:path* → /api/index ; /* → /index.html

# Shared package
packages/db/prisma/
├── schema.prisma               # Ajout User (champs auth) + RefreshToken + enum Locale
└── migrations/
    └── 20260222_user_auth/     # Générée par db:migrate
```

---

## SLOs définis pour cette feature

| Endpoint | Latence p95 cible | Raison |
|---|---|---|
| `POST /auth/login` | < 600 ms | Argon2id verify ~150–250 ms + DB |
| `POST /auth/register` | < 700 ms | Argon2id hash ~150–250 ms + DB write |
| `GET /auth/me` | < 80 ms | Lecture DB simple, pas de hash |
| `POST /auth/refresh` | < 150 ms | DB lookup + JWT sign |
| `PATCH /account/profile` | < 200 ms | DB write simple |
