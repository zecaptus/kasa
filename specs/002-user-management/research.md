# Research: User Management (002)

**Date**: 2026-02-22
**Branch**: `002-user-management`

---

## D1 — Stockage & transmission du token de session

**Decision**: Deux cookies httpOnly séparés — `access_token` (15 min) + `refresh_token` (7 j glissants, scoped `/api/auth/refresh`).

**Rationale**:
- Deux durées de vie différentes = deux `maxAge` distincts.
- `refresh_token` scoped à son endpoint → n'est pas envoyé sur chaque requête API.
- Cookie httpOnly inaccessible au JS → immunité XSS totale.
- `SameSite=Strict` + same-origin deploy → CSRF impossible sans token supplémentaire.

**Alternatives rejetées**:
- `localStorage` : accessible au JS, vulnérable XSS. Rejeté.
- Un seul cookie : impossible d'avoir deux `maxAge` distincts. Rejeté.
- `koa-session` : gère l'état côté serveur en sessions traditionnelles, incompatible avec JWT stateless. Rejeté.

**API Koa** : `ctx.cookies.set()` natif — aucun package supplémentaire. Attributs :
```
httpOnly: true
secure: NODE_ENV === 'production'
sameSite: 'strict'
```
Ne pas définir `domain:` → cookie host-only (`kasa.vercel.app`, pas les sous-domaines).

---

## D2 — Refresh token : contenu et rotation

**Decision**: Token opaque (`crypto.randomUUID()`) stocké en DB, pas un JWT. Rotation sliding window + token family + détection de réutilisation.

**Rationale**:
- Token opaque = révocable en DB (un JWT refresh ne peut pas être révoqué sans blocklist).
- Token family : chaque rotation crée un nouveau token dans la même famille. Réutilisation d'un token consommé → toute la famille est supprimée (protection vol de token).
- Sliding window : la session reste active tant que l'utilisateur utilise l'app (comportement attendu pour une app perso).

**Schéma RefreshToken** :
```
id          cuid()
token       uuid @unique
family      uuid (groupement)
userId      FK → User
expiresAt   DateTime
usedAt      DateTime?  (null = valide)
createdAt   now()
```

---

## D3 — Brute-force protection (pas de Redis)

**Decision**: Compteur DB inline sur le modèle `User` — champs `failedLoginAttempts: Int @default(0)` et `lockedUntil: DateTime?`.

**Rationale**:
- App perso mono-instance → pas besoin de Redis pour la synchronisation multi-process.
- Compteur DB survit aux redémarrages (contrairement à un Map en mémoire).
- Ajoute ~1 requête DB par tentative de login — acceptable.
- Seuil : 5 échecs → verrou 15 min. Message générique sans révéler le seuil.

**Alternatives rejetées**:
- Map en mémoire : perdu au redémarrage. Rejeté.
- Redis : ajout d'infra non justifié pour une app perso. Rejeté.
- Table `LoginAttempt` séparée : surcharge relationnelle inutile. Rejeté.

---

## D4 — Hashage de mot de passe

**Decision**: `argon2` (npm), variante Argon2id, paramètres OWASP 2024 : `m=64MiB, t=3, p=1`.

**Rationale**:
- Argon2id = vainqueur PHC 2015 + recommandation OWASP 2024.
- Memory-hard → résistant GPU/ASIC (bcrypt = CPU only).
- bcrypt tronque silencieusement à 72 octets → bug de sécurité latent. Rejeté.
- `argon2` embarque ses types TypeScript (pas de `@types/argon2` nécessaire).

**Latence estimée** : ~150–250 ms pour hash/verify avec ces paramètres → SLO login < 600 ms (p95) reste atteignable.

---

## D5 — Middleware auth Koa

**Decision**: Middleware custom `requireAuth` → `ctx.state.user: AuthenticatedUser`. Pas de `koa-jwt`.

**Rationale**:
- `koa-jwt` lit l'en-tête `Authorization` (Bearer), incompatible avec les cookies httpOnly.
- Le middleware custom est trivial (< 20 lignes), pleinement typé, sans dépendance supplémentaire.
- `ctx.state` est l'emplacement idiomatique Koa pour les données request-scoped.
- Augmentation de type `declare module 'koa'` dans `backend/src/types/koa.d.ts`.

**Bibliothèque JWT** : `jsonwebtoken` (auth0), HS256. `@types/jsonwebtoken` requis (package CommonJS sans types bundlés).

---

## D6 — Frontend : base query RTK Query

**Decision**: `credentials: 'include'` dans `fetchBaseQuery`, baseUrl `/api`. Pattern `baseQueryWithReauth` avec mutex (`async-mutex`) pour la rotation des tokens sur 401.

**Rationale**:
- `credentials: 'include'` → le navigateur envoie le cookie httpOnly automatiquement.
- Sans mutex, plusieurs requêtes simultanées en 401 déclencheraient plusieurs refresh en parallèle, épuisant le token family.
- Le Redux auth slice stocke uniquement les métadonnées utilisateur (`id`, `email`, `name`) + `isAuthenticated` + `isInitialized`. Jamais le token.

---

## D7 — Proxy Vite (développement)

**Decision**: `server.proxy['/api']` → `http://localhost:3000` dans `vite.config.ts`. `changeOrigin: true`.

**Rationale**:
- Sans proxy, le frontend sur `:5173` et le backend sur `:3000` sont des origines distinctes → `SameSite=Strict` bloque les cookies.
- Avec proxy, le navigateur voit un seul `localhost:5173` → les cookies sont envoyés correctement.
- Pas de réécriture de chemin : le backend Koa attend le préfixe `/api`.

---

## D8 — Routes protégées React

**Decision**: React Router v7 (`react-router`), `createBrowserRouter` + `<ProtectedRoute>` avec `<Outlet>` + sélecteur Redux (`isAuthenticated`, `isInitialized`).

**Rationale**:
- React Router n'est pas encore installé dans le projet → à ajouter.
- `isInitialized` évite le flash login/dashboard pendant le `GET /api/auth/me` initial.
- Pattern SPA (pas SSR/Remix) : auth check une seule fois au démarrage via `useGetMeQuery`, stocké dans Redux.

---

## D9 — Indicateur de force du mot de passe

**Decision**: Utilitaire custom `passwordStrength.ts` (5 checks regex → score 0–4). Pas de zxcvbn.

**Rationale**:
- `zxcvbn` : ~820 kB minifié (non bundleable directement). `@zxcvbn-ts/core` : ~60 kB + dicts FR ~150 kB. Coût injustifié.
- Custom regex couvre les critères ANSSI sans dépendance ni impact bundle.
- Labels i18n contrôlés (react-intl).

---

## D10 — Déploiement Vercel

**Decision**: `api/index.ts` à la racine du repo (re-export de `app.callback()`). `vercel.json` corrigé.

**Rationale**:
- Vercel détecte les fonctions serverless uniquement dans `api/` à la racine.
- `backend/src/app.ts` n'est pas visible du runtime Vercel sans Build Output API custom.
- `api/index.ts` est un shim minimal (1 ligne) — toute la logique reste dans `backend/`.
- Les rewrites Vercel sont transparents pour le navigateur → cookies `SameSite=Strict` fonctionnent.
- Pas de CORS nécessaire pour les requêtes frontend (même origin via rewrite).

**`vercel.json` corrigé** :
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## Packages à ajouter

| Package | Workspace | Raison |
|---|---|---|
| `argon2` | `@kasa/backend` | Hashage Argon2id |
| `jsonwebtoken` | `@kasa/backend` | Signature/vérification JWT |
| `@types/jsonwebtoken` | `@kasa/backend` (dev) | Types pour jsonwebtoken (CommonJS) |
| `react-router` | `@kasa/frontend` | Routing SPA + routes protégées |
| `async-mutex` | `@kasa/frontend` | Mutex pour baseQueryWithReauth |

## Variables d'environnement à ajouter (backend/src/config.ts)

| Variable | Description | Exemple |
|---|---|---|
| `JWT_SECRET` | Clé secrète HS256 (min 32 chars) | `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRES` | Durée de vie access token | `'15m'` |
| `REFRESH_TOKEN_TTL_DAYS` | Durée de vie refresh token (jours) | `7` |
