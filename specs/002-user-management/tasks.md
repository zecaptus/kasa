# Tasks: User Management (002)

**Input**: Design documents from `/specs/002-user-management/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Inclus — requis par la Constitution (Principe II : Testing Standards, couverture ≥ 80%).

**Organization**: Organisé par user story pour permettre une implémentation et une validation indépendantes.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallélisable (fichiers distincts, sans dépendances mutuelles non résolues)
- **[Story]**: User story associée (US1–US5)
- Chemins absolus depuis la racine du repo

---

## Phase 1: Setup (Infrastructure partagée)

**Purpose**: Packages, schéma Prisma, config env, infra Vercel/Vite. Aucune story ne peut commencer avant.

- [x] T001 Installer les packages backend (`argon2`, `jsonwebtoken`) et dev (`@types/jsonwebtoken`) dans `backend/package.json` via `pnpm --filter @kasa/backend add`
- [x] T002 [P] Installer les packages frontend (`react-router`, `async-mutex`) dans `frontend/package.json` via `pnpm --filter @kasa/frontend add`
- [x] T003 Mettre à jour `packages/db/prisma/schema.prisma` : ajouter `enum Locale { FR EN }`, les champs auth sur `User` (`passwordHash`, `name`, `locale`, `failedLoginAttempts`, `lockedUntil`, `updatedAt`, `refreshTokens`) et le modèle `RefreshToken` complet (voir data-model.md)
- [ ] T004 Exécuter la migration Prisma : `pnpm --filter @kasa/db run db:migrate` — nommer la migration `user_auth` ⚠️ DEFERRED: requires running PostgreSQL
- [x] T005 [P] Régénérer le client Prisma : `pnpm --filter @kasa/db run db:generate`
- [x] T006 [P] Ajouter les variables `JWT_SECRET` (string, min 32 chars), `JWT_ACCESS_EXPIRES` (string, défaut `'15m'`), `REFRESH_TOKEN_TTL_DAYS` (number, défaut `7`) au schéma zod de `backend/src/config.ts`
- [x] T007 [P] Créer `backend/src/types/koa.d.ts` : interface `AuthenticatedUser { sub: string; email: string }` + augmentation `declare module 'koa' { interface DefaultState { user: AuthenticatedUser } }`
- [x] T008 [P] Créer `api/index.ts` à la racine du repo : `export { default } from './backend/src/app'` (shim Vercel serverless)
- [x] T009 [P] Corriger `vercel.json` : `buildCommand: "pnpm build"`, `outputDirectory: "frontend/dist"`, rewrites `[{"/api/:path*" → "/api/index"}, {"/((?!api/).*)" → "/index.html"}]`
- [x] T010 [P] Ajouter `server.proxy` à `frontend/vite.config.ts` : `{ '/api': { target: 'http://localhost:3000', changeOrigin: true } }`

**Checkpoint**: `pnpm install` passe, migration appliquée, config.ts compile — infrastructure prête.

---

## Phase 2: Fondation (Prérequis bloquants)

**Purpose**: Couche service crypto + middleware auth + store Redux + base RTK Query. Bloque toutes les stories.

**⚠️ CRITIQUE**: Aucune user story ne peut commencer avant la fin de cette phase.

- [x] T011 Créer `backend/src/services/auth.service.ts` avec les fonctions pures : `hashPassword(plain: string): Promise<string>` et `verifyPassword(hash: string, plain: string): Promise<boolean>` (argon2id, m=64MiB t=3 p=1)
- [x] T012 [P] Créer `backend/src/middleware/auth.ts` : middleware `requireAuth(ctx, next)` — lit `access_token` cookie, vérifie JWT HS256, positionne `ctx.state.user`, throw 401 générique si invalide/absent
- [x] T013 [P] Créer `frontend/src/store/index.ts` : `configureStore` Redux Toolkit + exports `RootState` et `AppDispatch`
- [x] T014 [P] Créer `frontend/src/store/authSlice.ts` : slice avec state `{ user, isAuthenticated, isInitialized }` et reducers `userLoaded`, `loggedOut`, `initialized` (jamais de token stocké)
- [x] T015 [P] Créer `frontend/src/services/api.ts` : `fetchBaseQuery({ baseUrl: '/api', credentials: 'include' })`
- [x] T016 Créer `frontend/src/services/baseQueryWithReauth.ts` : pattern mutex (`async-mutex`) — 401 → `POST /auth/refresh` → retry, sinon dispatch `loggedOut()` (dépend de T014, T015)
- [x] T017 Créer squelette de `backend/src/routes/auth.router.ts` (router `@koa/router` vide) et l'enregistrer dans `backend/src/app.ts` avec préfixe `/api`
- [x] T018 [P] Créer squelette de `backend/src/routes/account.router.ts` (router `@koa/router` vide) et l'enregistrer dans `backend/src/app.ts` avec préfixe `/api`

**Checkpoint**: `pnpm typecheck` passe. Le middleware auth est importable. Le store Redux est configuré.

---

## Phase 3: US1 — Inscription (Priority: P1) 🎯 MVP

**Goal**: Un visiteur peut créer un compte et être immédiatement connecté.

**Independent Test**: Appeler `POST /api/auth/register` avec email/password/name valides → 201 + cookies `access_token` + `refresh_token` définis. Accéder à `GET /api/auth/me` avec les cookies → 200 avec les données utilisateur.

### Tests US1

- [ ] T019 [P] [US1] Écrire les tests unitaires pour `hashPassword` et `verifyPassword` dans `backend/tests/unit/services/auth.service.test.ts` — vérifier hash non réversible, verify correct/incorrect
- [ ] T020 [P] [US1] Écrire le test d'intégration register dans `backend/tests/integration/auth.test.ts` : succès 201 + cookies, email déjà utilisé 409, validation email invalide 422, validation password < 8 chars 422, double-submit idempotent

### Implémentation US1

- [x] T021 [US1] Implémenter `register(email, password, name)` dans `backend/src/services/auth.service.ts` : normaliser email lowercase, vérifier unicité, hasher le mot de passe, créer `User` en DB (dépend de T011)
- [x] T022 [US1] Implémenter `issueTokens(userId, email, ctx)` dans `backend/src/services/auth.service.ts` : signer JWT access (HS256, 15 min), générer UUID refresh + stocker en DB (`RefreshToken`), poser les deux cookies httpOnly (dépend de T021)
- [x] T023 [US1] Implémenter `POST /api/auth/register` dans `backend/src/routes/auth.router.ts` : validation zod body, appel `auth.service.register` + `issueTokens`, réponse 201 `UserDto` (dépend de T021, T022)
- [x] T024 [P] [US1] Créer `frontend/src/lib/passwordStrength.ts` : fonction `getPasswordStrength(password)` → `{ score: 0-4, label, color }` (5 checks regex : longueur ≥12, majuscule, minuscule, chiffre, spécial)
- [x] T025 [P] [US1] Écrire tests unitaires pour `passwordStrength.ts` dans `frontend/tests/unit/lib/passwordStrength.test.ts` : couvrir score 0, 2, 4 + cas limite longueur 8
- [x] T026 [P] [US1] Ajouter les clés i18n `auth.register.*` (title, email, password, name, submit, errors.emailTaken, errors.validation, strength.weak/fair/good/strong/veryStrong) dans `frontend/src/i18n/fr.json` et `frontend/src/i18n/en.json`
- [x] T027 [US1] Créer `frontend/src/pages/RegisterPage.tsx` : formulaire mobile-first (email, name, password + `PasswordStrengthIndicator`), mutation RTK Query `useRegisterMutation`, dispatch `userLoaded`, redirect vers `/` (dépend de T024, T026)

**Checkpoint**: `POST /api/auth/register` opérationnel. `RegisterPage.tsx` rendu et soumission réussie.

---

## Phase 4: US2 — Connexion (Priority: P1)

**Goal**: Un utilisateur inscrit peut se connecter et maintenir sa session.

**Independent Test**: Appeler `POST /api/auth/login` avec credentials valides → 200 + cookies. Vérifier que 5 tentatives échouées → 429 avec `Retry-After`. Appeler `POST /api/auth/refresh` → nouveaux cookies. Accéder à `GET /api/auth/me` → profil courant.

### Tests US2

- [ ] T028 [P] [US2] Ajouter tests unitaires pour la logique login/brute-force dans `backend/tests/unit/services/auth.service.test.ts` : credentials invalides, compte inexistant (timing constant), incrément compteur, verrou après 5 échecs, reset après succès
- [ ] T029 [P] [US2] Ajouter tests d'intégration login dans `backend/tests/integration/auth.test.ts` : succès 200 + cookies, credentials erronés 401 (message générique), 5e échec 429 + Retry-After header, refresh rotation 200, refresh consommé → reuse detection 401

### Implémentation US2

- [x] T030 [US2] Implémenter `login(email, password, ctx)` dans `backend/src/services/auth.service.ts` : lookup user (lowercase), constant-time dummy verify si inexistant, check `lockedUntil`, `verifyPassword`, incrément/reset `failedLoginAttempts`, appel `issueTokens` (dépend de T022)
- [x] T031 [US2] Implémenter `POST /api/auth/login` dans `backend/src/routes/auth.router.ts` : validation zod, appel `auth.service.login`, réponse 200 `UserDto` ou 401/429 (dépend de T030)
- [x] T032 [US2] Implémenter `rotateRefreshToken(token, ctx)` dans `backend/src/services/auth.service.ts` : lookup token en DB, détecter `usedAt != null` → wipe family + 401, marquer comme utilisé, émettre nouveaux tokens via `issueTokens`
- [x] T033 [US2] Implémenter `POST /api/auth/refresh` dans `backend/src/routes/auth.router.ts` : lire cookie `refresh_token`, appel `rotateRefreshToken`, réponse 200 `UserDto` (dépend de T032)
- [x] T034 [US2] Implémenter `GET /api/auth/me` dans `backend/src/routes/auth.router.ts` : middleware `requireAuth`, lookup user par `ctx.state.user.sub`, réponse 200 `UserDto` (dépend de T012)
- [x] T035 [P] [US2] Créer `frontend/src/services/authApi.ts` : RTK Query `createApi` avec `baseQueryWithReauth` — endpoints `login`, `register`, `refresh`, `getMe`, `logout`, `updateProfile` (injectEndpoints pattern)
- [x] T036 [P] [US2] Ajouter les clés i18n `auth.login.*` (title, email, password, submit, errors.invalidCredentials, errors.locked, errors.lockedRetry) dans `fr.json` et `en.json`
- [x] T037 [US2] Créer `frontend/src/pages/LoginPage.tsx` : formulaire mobile-first (email + password), mutation `useLoginMutation`, dispatch `userLoaded`, redirect vers `/`, gestion 401/429 avec messages i18n (dépend de T035, T036)

**Checkpoint**: Login/refresh/me fonctionnels. Session persiste entre rechargements (cookie). Brute-force bloque après 5 échecs.

---

## Phase 5: US3 — Protection des routes (Priority: P2)

**Goal**: Les pages protégées sont inaccessibles sans session valide.

**Independent Test**: Naviguer vers `/` sans cookie → redirect `/connexion`. Se connecter → redirect vers `/`. Naviguer vers `/connexion` connecté → redirect vers `/`.

### Tests US3

- [ ] T038 [P] [US3] Écrire test d'intégration frontend dans `frontend/tests/integration/auth.test.tsx` : visiter URL protégée sans auth → redirect `/connexion`, visiter `/connexion` authentifié → redirect `/`

### Implémentation US3

- [x] T039 [US3] Créer `frontend/src/components/ProtectedRoute.tsx` : sélecteur Redux `{ isAuthenticated, isInitialized }` — spinner si `!isInitialized`, `<Navigate to="/connexion" replace />` si `!isAuthenticated`, sinon `<Outlet />` (dépend de T014)
- [x] T040 [US3] Configurer `createBrowserRouter` dans `frontend/src/main.tsx` : route `/connexion` → `LoginPage`, route `/inscription` → `RegisterPage`, routes protégées via `<ProtectedRoute>` (route `/` → placeholder `Dashboard`) (dépend de T039)
- [x] T041 [US3] Wrapper `<App>` avec `<Provider store>` + `<RouterProvider router>` dans `frontend/src/main.tsx` (dépend de T013, T040)
- [x] T042 [US3] Ajouter `useGetMeQuery` dans le composant racine (layout ou `App`) : dispatcher `userLoaded` ou `initialized` selon la réponse, pour initialiser `isInitialized` au démarrage (dépend de T034, T035, T041)

**Checkpoint**: Navigation protégée fonctionnelle. `isInitialized` évite le flash login.

---

## Phase 6: US4 — Déconnexion (Priority: P2)

**Goal**: L'utilisateur peut invalider sa session courante sans affecter les autres appareils.

**Independent Test**: Appeler `POST /api/auth/logout` avec cookie valide → 204 + cookies effacés. Re-appeler `GET /api/auth/me` → 401.

### Tests US4

- [ ] T043 [P] [US4] Ajouter test d'intégration logout dans `backend/tests/integration/auth.test.ts` : logout 204 + cookies cleared, re-login possible après, session autres appareils non affectée (2 sessions distinctes)

### Implémentation US4

- [x] T044 [US4] Implémenter `logout(refreshToken, ctx)` dans `backend/src/services/auth.service.ts` : chercher et marquer `usedAt = now()` (ou supprimer) le token courant en DB, effacer les deux cookies (`maxAge: 0`)
- [x] T045 [US4] Implémenter `POST /api/auth/logout` dans `backend/src/routes/auth.router.ts` : middleware `requireAuth`, lire cookie `refresh_token`, appel `logout`, réponse 204 (dépend de T044)
- [x] T046 [P] [US4] Ajouter clé i18n `auth.logout.button` dans `fr.json` et `en.json`
- [x] T047 [US4] Créer `frontend/src/components/NavBar.tsx` (ou équivalent layout) avec bouton "Se déconnecter" : mutation `useLogoutMutation`, dispatch `loggedOut()`, redirect `/connexion` (dépend de T035, T046)

**Checkpoint**: Déconnexion invalide le token courant. Autres sessions inchangées. Redirect vers `/connexion`.

---

## Phase 7: US5 — Profil utilisateur (Priority: P3)

**Goal**: L'utilisateur peut modifier son nom et sa langue préférée depuis la page profil.

**Independent Test**: Appeler `PATCH /api/account/profile` avec `{ name: "Nouveau Nom" }` → 200 + UserDto mis à jour. Vérifier persistance via `GET /api/auth/me`. Soumettre `name: ""` → 422.

### Tests US5

- [ ] T048 [P] [US5] Ajouter test d'intégration profile dans `backend/tests/integration/auth.test.ts` : update nom 200, update locale EN 200, nom vide 422, email readonly (ignoré si fourni)
- [ ] T049 [P] [US5] Écrire tests unitaires authSlice dans `frontend/tests/unit/store/authSlice.test.ts` : `userLoaded`, `loggedOut`, `initialized` — vérifier state shape et transitions

### Implémentation US5

- [x] T050 [US5] Créer `backend/src/services/account.service.ts` : `updateProfile(userId, { name?, locale? })` — validation, update Prisma, retourner `UserDto`
- [x] T051 [US5] Implémenter `PATCH /api/account/profile` dans `backend/src/routes/account.router.ts` : middleware `requireAuth`, validation zod body (au moins un champ, name ≥1 char, locale enum), appel `account.service.updateProfile`, réponse 200 `UserDto` (dépend de T050)
- [x] T052 [P] [US5] Ajouter les clés i18n `account.profile.*` (title, name, email, locale, localeOptions.fr, localeOptions.en, submit, success, errors.nameRequired) dans `fr.json` et `en.json`
- [x] T053 [US5] Créer `frontend/src/pages/ProfilePage.tsx` : afficher email (lecture seule), champs name + locale editables, mutation `useUpdateProfileMutation`, dispatch `userLoaded` après succès, i18n complet (dépend de T035, T052)
- [x] T054 [US5] Ajouter route `/profil` → `ProfilePage` dans `createBrowserRouter` (sous `ProtectedRoute`) dans `frontend/src/main.tsx` (dépend de T040, T053)

**Checkpoint**: Profil modifiable. Email affiché en readonly. Changement de langue effectif immédiatement.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Qualité, couverture, conformité constitution.

- [x] T055 [P] Exécuter `pnpm check` (Biome lint + format) — corriger toutes les erreurs et warnings dans les fichiers créés/modifiés par cette feature
- [x] T056 [P] Exécuter `pnpm typecheck` — corriger toutes les erreurs TypeScript strict
- [ ] T057 Exécuter `pnpm test --coverage` — vérifier couverture ≥ 80% (statements, branches, functions, lines) par module ; corriger les lacunes identifiées
- [ ] T058 [P] Vérifier les SLOs du quickstart.md : tester manuellement les temps de réponse des endpoints critiques (`/auth/login` < 600 ms, `/auth/me` < 80 ms) avec `curl -w "%{time_total}"` en local
- [x] T059 Mettre à jour `CLAUDE.md` section "Recent Changes" : `002-user-management: auth JWT httpOnly cookie implémentée — argon2, RTK Query reauth, React Router v7`

---

## Dependencies & Execution Order

### Ordre des phases

- **Phase 1 (Setup)**: Démarre immédiatement — aucune dépendance
- **Phase 2 (Fondation)**: Dépend de Phase 1 — **BLOQUE toutes les stories**
- **Phase 3 (US1 Inscription)**: Dépend de Phase 2
- **Phase 4 (US2 Connexion)**: Dépend de Phase 2 + Phase 3 (`issueTokens` créé en US1)
- **Phase 5 (US3 Routes)**: Dépend de Phase 2 + Phase 4 (`getMe` endpoint requis)
- **Phase 6 (US4 Déconnexion)**: Dépend de Phase 2 + Phase 4 (`refresh_token` cookie requis)
- **Phase 7 (US5 Profil)**: Dépend de Phase 2 + Phase 5 (routes protégées requises)
- **Phase 8 (Polish)**: Dépend de toutes les phases

### Dépendances inter-stories

```
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3)
                                                     → Phase 6 (US4)
                                   Phase 5 + Phase 6 → Phase 7 (US5)
```

### Dépendances clés dans la couche service

- `hashPassword` / `verifyPassword` (T011) → `register` (T021) → `issueTokens` (T022) → `login` (T030) → `rotateRefreshToken` (T032) → `logout` (T044)

---

## Opportunités de parallélisme

### Phase 1 (toutes parallélisables sauf T003→T004→T005)

```
T001 (pnpm backend deps)     ──┐
T002 (pnpm frontend deps)    ──┤
T006 (config.ts)             ──┤ → T003 (schema) → T004 (migrate) → T005 (generate)
T007 (koa.d.ts)              ──┤
T008 (api/index.ts)          ──┤
T009 (vercel.json)           ──┤
T010 (vite.config.ts)        ──┘
```

### Phase 2

```
T011 (auth.service.ts) ─────────────────────────────────────────┐
T012 (requireAuth middleware)  ────────────────────────────────┐ │
T013 (store/index.ts)          ──┐                             │ │
T014 (authSlice.ts)            ──┤ → T016 (baseQueryWithReauth)│ │
T015 (services/api.ts)         ──┘                             │ │
T017 (auth.router.ts skeleton) → app.ts                        │ │
T018 (account.router.ts)       → app.ts                        │ │
                                                               ↓ ↓
                                                            Phase 3+
```

### Phase 3 US1 (tests en parallèle, implémentation séquentielle)

```
T019 (unit tests) ──┐
T020 (integ tests)──┤ → T021 → T022 → T023 (backend, séquentiel)
T024 (passwordStrength.ts) ──┐
T025 (tests passwordStrength)──┤ → T026 (i18n) → T027 (RegisterPage)
```

---

## Exemples de lancement parallèle

### Phase 1

```bash
# Lancer en parallèle (terminaux séparés ou Task tool) :
pnpm --filter @kasa/backend add argon2 jsonwebtoken   # T001
pnpm --filter @kasa/frontend add react-router async-mutex  # T002
# Puis en séquence :
# T003 → T004 → T005 (schema → migrate → generate)
```

### Phase 3 — Tâches parallèles US1

```bash
# Backend (T019, T020) et Frontend (T024, T025) en parallèle :
Task: "Écrire tests unitaires auth.service.ts"    # T019
Task: "Écrire tests intégration register"         # T020
Task: "Créer passwordStrength.ts"                 # T024
Task: "Écrire tests passwordStrength.ts"          # T025
```

---

## Implementation Strategy

### MVP (US1 + US2 seulement — inscription + connexion)

1. Compléter Phase 1: Setup
2. Compléter Phase 2: Fondation
3. Compléter Phase 3: US1 Inscription
4. Compléter Phase 4: US2 Connexion
5. **ARRÊT ET VALIDATION** : inscription + connexion + session persistante testés
6. Déployer / démontrer si prêt

### Livraison incrémentale

1. Setup + Fondation → infrastructure prête
2. US1 Inscription → `RegisterPage.tsx` fonctionnelle → demo
3. US2 Connexion → `LoginPage.tsx` + refresh + `GET /auth/me` → session persistante
4. US3 Routes → navigation protégée → app sécurisée navigable
5. US4 Déconnexion → sécurité complète → démo multi-onglets
6. US5 Profil → expérience personnalisable → feature complète

---

## Notes

- **[P]** = fichiers distincts, pas de dépendance mutuelle non résolue dans la même phase
- Chaque story est testable indépendamment à son checkpoint
- Les tests doivent être écrits AVANT l'implémentation (TDD) pour les tâches marquées avant leur story
- `pnpm check` + `pnpm typecheck` après chaque phase
- Ne jamais stocker le token dans Redux ou localStorage — httpOnly cookie uniquement
- Committer après chaque phase ou groupe logique

---

**Total**: 59 tâches | **MVP** : T001–T037 (37 tâches — Phases 1–4)
