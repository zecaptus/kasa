# Implementation Plan: User Management

**Branch**: `002-user-management` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-user-management/spec.md`

## Summary

Implémenter le socle d'authentification de Kasa : inscription email/password, connexion/déconnexion JWT, protection des routes, profil utilisateur. Les tokens de session transitent exclusivement via cookies `httpOnly + Secure + SameSite=Strict`. Le déploiement same-origin (Vercel rewrites) rend les cookies compatibles sans CORS. La protection brute-force est assurée par un compteur DB sur le modèle `User` (5 échecs → verrou 15 min). Les mots de passe sont hashés en Argon2id.

---

## Technical Context

**Language/Version**: TypeScript 5.7 strict — Node.js 22 LTS
**Primary Dependencies**:
- Backend: Koa 2 + `@koa/router` + `argon2` + `jsonwebtoken`
- Frontend: React 19 + Redux Toolkit + RTK Query + `react-router` v7 + `async-mutex`
- Shared: Prisma 6 (`@kasa/db`) + PostgreSQL 16
**Storage**: PostgreSQL 16 via Prisma — tables `User`, `RefreshToken` (+ enum `Locale`)
**Testing**: Vitest 3 — jsdom (frontend) / node (backend) — coverage ≥ 80% par module
**Target Platform**: Node.js 22 LTS (backend serverless Vercel) + navigateur moderne (SPA)
**Project Type**: Web application — monorepo (frontend + backend séparés)
**Performance Goals**:
- `POST /auth/login` p95 < 600 ms
- `POST /auth/register` p95 < 700 ms
- `GET /auth/me` p95 < 80 ms
- `POST /auth/refresh` p95 < 150 ms
- `PATCH /account/profile` p95 < 200 ms
**Constraints**:
- Tokens jamais dans le DOM ni dans Redux (httpOnly cookie exclusif)
- Email read-only en v1 depuis le profil
- `SameSite=Strict` → same-origin obligatoire (proxy Vite dev / rewrites Vercel prod)
- Argon2id m=64MiB t=3 p=1 (OWASP 2024 minimums)
**Scale/Scope**: App perso mono-utilisateur — pas de scalabilité horizontale requise en v1

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Code Quality**: Biome configuré globalement (`biome.json` à la racine) — lint + format CI bloquant. Complexité ≤ 10 : les services auth seront découpés en fonctions atomiques (hash, verify, issueTokens, revokeToken). Aucune exception prévue.
- [x] **II. Testing Standards**: Stratégie documentée dans quickstart.md. Cibles : unit tests sur `auth.service.ts` (hash, lockout, JWT), integration tests supertest sur tous les endpoints auth, tests ProtectedRoute + formulaires frontend. Coverage ≥ 80% par module.
- [x] **III. UX Consistency**: Toutes les chaînes via `react-intl` (fr.json + en.json). Messages d'erreur : jamais de détails techniques exposés (message générique "Identifiants incorrects"). Pattern de validation inline cohérent avec la constitution (erreurs sous le champ, sans rechargement). Indicateur de force mot de passe non bloquant.
- [x] **IV. Performance**: SLOs définis ci-dessus et dans quickstart.md. Baseline à établir lors des premiers tests d'intégration (mesure via `Date.now()` dans les tests supertest). La latence Argon2id (~200 ms) est le facteur dominant — documentée et acceptée.
- [x] **Violations**: Aucune. Toutes les exceptions sont justifiées (Argon2id : latence délibérément élevée pour la sécurité — trade-off documenté).

*Post-Phase 1 re-check* : Constitution respectée. Aucune violation identifiée dans les contrats ou le data model.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-user-management/
├── spec.md              # Spécification fonctionnelle (clarifiée)
├── plan.md              # Ce fichier
├── research.md          # Décisions techniques documentées (D1–D10)
├── data-model.md        # Schéma Prisma + DTOs + règles métier
├── quickstart.md        # Setup, commandes, SLOs, structure des fichiers
├── contracts/
│   └── openapi.yaml     # OpenAPI 3.1 — 6 endpoints (register, login, logout, refresh, me, profile)
├── checklists/
│   └── requirements.md  # Quality checklist (tous items ✅)
└── tasks.md             # Généré par /speckit.tasks (prochaine étape)
```

### Source Code (repository root)

```text
# Backend — fichiers créés / modifiés
backend/src/
├── config.ts                    # MODIFIÉ — ajouter JWT_SECRET, JWT_ACCESS_EXPIRES, REFRESH_TOKEN_TTL_DAYS
├── app.ts                       # MODIFIÉ — enregistrer auth.router + account.router
├── routes/
│   ├── auth.router.ts           # CRÉÉ — register, login, logout, refresh, me
│   └── account.router.ts        # CRÉÉ — PATCH /account/profile
├── middleware/
│   └── auth.ts                  # CRÉÉ — requireAuth middleware (ctx.state.user)
├── services/
│   ├── auth.service.ts          # CRÉÉ — register, login, logout, refresh (Argon2id + JWT + cookies)
│   └── account.service.ts       # CRÉÉ — updateProfile
└── types/
    └── koa.d.ts                 # CRÉÉ — augmentation DefaultState.user: AuthenticatedUser

backend/tests/
├── unit/services/
│   └── auth.service.test.ts     # CRÉÉ — hash, verify, lockout, token rotation
└── integration/
    └── auth.test.ts             # CRÉÉ — supertest : tous les flux + edge cases

# Frontend — fichiers créés / modifiés
frontend/src/
├── main.tsx                     # MODIFIÉ — Redux Provider + RouterProvider
├── services/
│   ├── api.ts                   # CRÉÉ — fetchBaseQuery({ credentials: 'include', baseUrl: '/api' })
│   ├── baseQueryWithReauth.ts   # CRÉÉ — mutex 401 → /auth/refresh → retry
│   └── authApi.ts               # CRÉÉ — RTK Query endpoints injectés
├── store/
│   ├── authSlice.ts             # CRÉÉ — user, isAuthenticated, isInitialized
│   └── index.ts                 # CRÉÉ — configureStore + RootState + AppDispatch
├── components/
│   └── ProtectedRoute.tsx       # CRÉÉ — <Outlet> + Redux selector
├── pages/
│   ├── LoginPage.tsx            # CRÉÉ — formulaire connexion
│   ├── RegisterPage.tsx         # CRÉÉ — formulaire inscription + PasswordStrengthIndicator
│   └── ProfilePage.tsx          # CRÉÉ — édition nom + locale
├── lib/
│   └── passwordStrength.ts      # CRÉÉ — score 0–4 (5 checks regex)
└── i18n/
    ├── fr.json                  # MODIFIÉ — clés auth.* + account.profile.*
    └── en.json                  # MODIFIÉ — mêmes clés en anglais

frontend/vite.config.ts          # MODIFIÉ — ajouter server.proxy['/api']

frontend/tests/
├── unit/
│   ├── lib/passwordStrength.test.ts   # CRÉÉ
│   └── store/authSlice.test.ts        # CRÉÉ
└── integration/
    └── auth.test.tsx                  # CRÉÉ — ProtectedRoute + formulaires

# Racine repo — Vercel
api/
└── index.ts                          # CRÉÉ — shim Vercel → re-export app.callback()

vercel.json                            # MODIFIÉ — rewrites corrigés

# Package partagé
packages/db/prisma/
├── schema.prisma                      # MODIFIÉ — enum Locale + User (champs auth) + RefreshToken
└── migrations/
    └── YYYYMMDD_user_auth/            # GÉNÉRÉ — par pnpm --filter @kasa/db run db:migrate
```

---

## Phase 0 — Research

**Statut : COMPLÈTE** — voir [research.md](research.md)

Décisions resolues :
- D1 : Cookie httpOnly 2 cookies (access + refresh)
- D2 : Refresh token opaque + token family + sliding window
- D3 : Brute-force DB counter inline sur User
- D4 : Argon2id (argon2 npm), m=64MiB t=3 p=1
- D5 : Middleware custom requireAuth → ctx.state.user
- D6 : RTK Query baseQueryWithReauth + async-mutex
- D7 : Proxy Vite server.proxy['/api']
- D8 : React Router v7 + ProtectedRoute + Outlet
- D9 : Custom passwordStrength.ts (pas de zxcvbn)
- D10 : api/index.ts Vercel shim + vercel.json corrigé

---

## Phase 1 — Design & Contracts

**Statut : COMPLÈTE**

### Artifacts générés

| Artifact | Fichier | Contenu |
|---|---|---|
| Data model | [data-model.md](data-model.md) | Schéma Prisma `User` + `RefreshToken` + enum `Locale` + DTOs |
| API contracts | [contracts/openapi.yaml](contracts/openapi.yaml) | OpenAPI 3.1 — 6 endpoints |
| Quickstart | [quickstart.md](quickstart.md) | Setup, commandes, SLOs, structure fichiers |

### Endpoints définis

| Méthode | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Non | Inscription — crée compte + émet 2 cookies |
| `POST` | `/api/auth/login` | Non | Connexion — vérifie credentials + émet 2 cookies |
| `POST` | `/api/auth/logout` | Oui | Déconnexion — invalide session courante uniquement |
| `POST` | `/api/auth/refresh` | Cookie refresh | Rotation token — émet 2 nouveaux cookies |
| `GET` | `/api/auth/me` | Oui | Profil utilisateur courant |
| `PATCH` | `/api/account/profile` | Oui | Mise à jour nom et/ou locale |

### Décisions d'implémentation clés

**Cookies** :
- `access_token` : `Path=/`, `maxAge=15min`, httpOnly + Secure + SameSite=Strict
- `refresh_token` : `Path=/api/auth/refresh`, `maxAge=7j`, httpOnly + Secure + SameSite=Strict
- Pas d'attribut `Domain` → host-only (ne s'applique pas aux sous-domaines)
- `Secure` conditionnel : `NODE_ENV === 'production'` (localhost dev = non-HTTPS)

**Vercel** :
- `api/index.ts` créé à la racine : `export { default } from '../backend/src/app'`
- `vercel.json` : `/api/:path*` → `/api/index` ; `/((?!api/).*)` → `/index.html`

**Sécurité** :
- Pas de CORS sur le backend pour les requêtes frontend (même origine via proxy/rewrite)
- `requireAuth` ne révèle jamais le contenu des erreurs JWT (tous les cas → 401 générique)
- Login : timing attack mitigation — même branche de code pour email inexistant (dummy argon2.verify)

---

## Complexity Tracking

> Aucune violation de constitution identifiée — section vide.
