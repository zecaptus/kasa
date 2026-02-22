# Data Model: User Management (002)

**Date**: 2026-02-22
**Branch**: `002-user-management`
**Source**: `packages/db/prisma/schema.prisma` (à modifier)

---

## Entités

### User

Entité principale. Représente un compte utilisateur enregistré.

| Champ | Type Prisma | Contraintes | Notes |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Identifiant interne |
| `email` | `String` | `@unique` | Normalisé en lowercase à l'inscription |
| `passwordHash` | `String` | — | Argon2id hash, jamais le mot de passe en clair |
| `name` | `String` | — | Nom affiché, modifiable depuis le profil |
| `locale` | `Locale` | `@default(FR)` | Langue préférée de l'interface |
| `failedLoginAttempts` | `Int` | `@default(0)` | Compteur de tentatives échouées |
| `lockedUntil` | `DateTime?` | nullable | Fin du blocage temporaire (null = pas bloqué) |
| `createdAt` | `DateTime` | `@default(now())` | Date de création du compte |
| `updatedAt` | `DateTime` | `@updatedAt` | Mis à jour automatiquement par Prisma |
| `refreshTokens` | `RefreshToken[]` | — | Relation — sessions actives multi-appareils |

**Règles métier** :
- `email` normalisé en minuscules avant stockage et à chaque lookup.
- `passwordHash` produit par Argon2id — jamais sérialisé dans les réponses API.
- `failedLoginAttempts` remis à 0 après une connexion réussie.
- `lockedUntil` ignoré si la date est dans le passé (déverouillage automatique).

---

### RefreshToken

Représente une session active sur un appareil. Un `User` peut en avoir plusieurs simultanément (multi-appareils).

| Champ | Type Prisma | Contraintes | Notes |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | — |
| `token` | `String` | `@unique` | UUID aléatoire opaque (`crypto.randomUUID()`) |
| `family` | `String` | `@@index` | UUID de famille — regroupe les tokens d'une même session |
| `userId` | `String` | `@@index`, FK | Référence vers `User` |
| `user` | `User` | `onDelete: Cascade` | Suppression en cascade si l'utilisateur est supprimé |
| `expiresAt` | `DateTime` | — | Date d'expiration absolue (J+7 depuis émission) |
| `usedAt` | `DateTime?` | nullable | null = token valide et non encore utilisé |
| `createdAt` | `DateTime` | `@default(now())` | — |

**Règles métier** :
- Un token avec `usedAt != null` est considéré consommé.
- Présentation d'un token consommé → **reuse détecté** → tous les tokens de la même `family` sont supprimés.
- Sliding window : chaque rotation remet `expiresAt` à J+7 dans le nouveau token.
- La déconnexion (`POST /api/auth/logout`) marque le token courant comme `usedAt = now()` (ou le supprime directement).

---

### Enum Locale

```prisma
enum Locale {
  FR
  EN
}
```

---

## Schéma Prisma (diff à appliquer)

```prisma
// packages/db/prisma/schema.prisma

enum Locale {
  FR
  EN
}

model User {
  id                   String         @id @default(cuid())
  email                String         @unique
  passwordHash         String
  name                 String
  locale               Locale         @default(FR)
  failedLoginAttempts  Int            @default(0)
  lockedUntil          DateTime?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  refreshTokens        RefreshToken[]
}

model RefreshToken {
  id        String    @id @default(cuid())
  token     String    @unique
  family    String
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([family])
  @@index([userId])
}
```

---

## Payload JWT (access token)

Le JWT access token contient uniquement ce qui est nécessaire pour l'auth stateless :

```typescript
interface JwtPayload {
  sub: string;    // User.id
  email: string;  // User.email (pour logs, pas pour lookup)
  iat: number;    // issued at (automatique jsonwebtoken)
  exp: number;    // expiration (automatique jsonwebtoken)
}
```

Le `role` n'est pas inclus en v1 (un seul rôle `USER`). À ajouter en v2 si admin requis.

---

## Données jamais exposées en API

- `passwordHash`
- `failedLoginAttempts`
- `lockedUntil`
- `RefreshToken.token`, `RefreshToken.family`

---

## DTO de réponse (shape commune)

```typescript
// Utilisé par /auth/me, /auth/login, /auth/register, /account/profile
interface UserDto {
  id: string;
  email: string;
  name: string;
  locale: 'FR' | 'EN';
  createdAt: string; // ISO 8601
}
```
