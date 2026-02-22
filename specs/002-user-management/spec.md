# Feature Specification: User Management

**Feature Branch**: `002-user-management`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Phase 1 — Fondations : inscription email/password, connexion/déconnexion, profil utilisateur, protection des routes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inscription (Priority: P1)

Un nouvel utilisateur arrive sur l'application sans compte. Il saisit son adresse email, choisit un mot de passe et crée son compte. Il est ensuite immédiatement connecté et redirigé vers le tableau de bord.

**Why this priority**: Sans inscription, aucune autre feature n'est utilisable. C'est le point d'entrée de toute l'application.

**Independent Test**: Tester en accédant à la page d'inscription, en créant un compte avec un email valide, et en vérifiant que l'utilisateur est connecté et redirigé.

**Acceptance Scenarios**:

1. **Given** un visiteur non authentifié sur la page d'inscription, **When** il soumet un email valide et un mot de passe respectant les règles, **Then** son compte est créé, il est connecté et redirigé vers le tableau de bord.
2. **Given** un visiteur sur la page d'inscription, **When** il saisit un email déjà utilisé, **Then** un message d'erreur clair lui indique que cet email est déjà associé à un compte.
3. **Given** un visiteur sur la page d'inscription, **When** il saisit un email invalide ou un mot de passe trop court (< 8 caractères), **Then** des erreurs de validation apparaissent inline avant même la soumission.
4. **Given** un visiteur sur la page d'inscription, **When** il soumet le formulaire, **Then** un indicateur de chargement est visible jusqu'à la réponse du serveur.

---

### User Story 2 - Connexion (Priority: P1)

Un utilisateur déjà inscrit accède à la page de connexion, saisit ses identifiants et accède à son espace personnel.

**Why this priority**: La connexion conditionne l'accès à toutes les fonctionnalités de l'application. Co-P1 avec l'inscription.

**Independent Test**: Tester en se connectant avec un compte préexistant, vérifier la redirection vers le tableau de bord et la persistance de session après rechargement de page.

**Acceptance Scenarios**:

1. **Given** un utilisateur inscrit sur la page de connexion, **When** il saisit email et mot de passe corrects, **Then** il est connecté et redirigé vers le tableau de bord.
2. **Given** un utilisateur sur la page de connexion, **When** il saisit un email ou mot de passe incorrect, **Then** un message d'erreur générique s'affiche (sans préciser lequel est incorrect).
3. **Given** un utilisateur connecté, **When** il recharge la page ou rouvre l'onglet, **Then** il reste connecté sans avoir à se reconnecter.
4. **Given** un utilisateur connecté depuis un moment, **When** sa session expire, **Then** il est redirigé vers la page de connexion avec un message explicatif.

---

### User Story 3 - Protection des routes (Priority: P2)

Un visiteur non authentifié tente d'accéder à une page protégée (ex. tableau de bord). Il est redirigé vers la page de connexion.

**Why this priority**: Nécessaire pour la sécurité de l'application, mais dépend du mécanisme de session établi en P1.

**Independent Test**: Tester en accédant directement à `/dashboard` sans être connecté, vérifier la redirection vers `/login`.

**Acceptance Scenarios**:

1. **Given** un visiteur non authentifié, **When** il tente d'accéder à une URL protégée, **Then** il est redirigé vers la page de connexion.
2. **Given** un visiteur non authentifié redirigé vers la page de connexion, **When** il se connecte avec succès, **Then** il est redirigé vers la page qu'il tentait d'accéder initialement.
3. **Given** un utilisateur authentifié, **When** il accède à `/login` ou `/register`, **Then** il est redirigé vers le tableau de bord (pas besoin de se reconnecter).

---

### User Story 4 - Déconnexion (Priority: P2)

Un utilisateur connecté choisit de se déconnecter. Sa session est invalidée et il est redirigé vers la page de connexion.

**Why this priority**: Fonctionnalité de sécurité indispensable, notamment sur un appareil partagé.

**Independent Test**: Tester via le bouton de déconnexion, vérifier que l'accès aux pages protégées est bloqué après déconnexion.

**Acceptance Scenarios**:

1. **Given** un utilisateur connecté, **When** il clique sur "Se déconnecter", **Then** sa session est invalidée et il est redirigé vers la page de connexion.
2. **Given** un utilisateur venant de se déconnecter, **When** il tente d'accéder à une page protégée, **Then** il est redirigé vers la connexion (la session n'est plus valide).
3. **Given** un utilisateur connecté sur plusieurs onglets, **When** il se déconnecte dans un onglet, **Then** les autres onglets ne lui permettent plus d'effectuer des actions authentifiées.

---

### User Story 5 - Profil utilisateur (Priority: P3)

Un utilisateur connecté peut consulter et modifier ses informations personnelles : nom affiché et langue de l'interface.

**Why this priority**: Améliore l'expérience mais n'est pas bloquant pour les phases suivantes.

**Independent Test**: Tester via la page profil en modifiant le nom et la langue, vérifier la persistance après rechargement.

**Acceptance Scenarios**:

1. **Given** un utilisateur connecté sur la page profil, **When** il modifie son nom et sauvegarde, **Then** le nouveau nom est affiché dans l'interface.
2. **Given** un utilisateur connecté sur la page profil, **When** il change la langue préférée, **Then** l'interface bascule dans la nouvelle langue immédiatement.
3. **Given** un utilisateur sur la page profil, **When** il soumet un nom vide, **Then** une erreur de validation lui indique que le champ est obligatoire.

---

### Edge Cases

- Que se passe-t-il si l'utilisateur soumet le formulaire d'inscription deux fois rapidement (double submit) ?
- Comment le système gère-t-il une tentative de connexion avec un compte inexistant (même message qu'un mauvais mot de passe — sécurité) ?
- Que se passe-t-il si la session expire en milieu d'action (ex. lors de la sauvegarde du profil) ?
- Comment gérer un email avec des majuscules (`User@Example.com` = `user@example.com`) ?
- Que se passe-t-il si le serveur est indisponible lors de la tentative de connexion ?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT permettre à un visiteur de créer un compte avec une adresse email et un mot de passe.
- **FR-002**: Le système DOIT valider que l'adresse email est au format valide avant la soumission.
- **FR-003**: Le système DOIT exiger un mot de passe d'au moins 8 caractères et DOIT afficher un indicateur visuel de robustesse (faible / moyen / fort) mis à jour en temps réel pendant la saisie. L'indicateur est informatif — il ne bloque pas la soumission.
- **FR-004**: Le système DOIT rejeter l'inscription si l'adresse email est déjà utilisée par un compte existant.
- **FR-005**: Le système DOIT permettre à un utilisateur inscrit de se connecter avec email et mot de passe.
- **FR-006**: Le système DOIT afficher un message d'erreur générique en cas d'identifiants incorrects (sans préciser lequel est erroné).
- **FR-006a**: Le système DOIT bloquer temporairement les tentatives de connexion depuis un même compte après 5 échecs consécutifs (verrou de 15 minutes). Le message d'erreur DOIT informer l'utilisateur de la durée de blocage sans révéler le seuil.
- **FR-007**: Le système DOIT maintenir la session de l'utilisateur entre les rechargements de page via un cookie HTTP-only, sécurisé, en mode same-site strict (inaccessible depuis JavaScript).
- **FR-007a**: Le système DOIT rejeter toute requête authentifiée ne présentant pas le cookie de session valide (aucune alternative via en-tête Authorization ou query param).
- **FR-008**: Le système DOIT invalider uniquement la session courante lors de la déconnexion explicite. Les sessions actives sur d'autres appareils restent valides (multi-sessions autorisées).
- **FR-009**: Le système DOIT rediriger les visiteurs non authentifiés vers la page de connexion lorsqu'ils accèdent à une page protégée.
- **FR-010**: Le système DOIT rediriger les utilisateurs authentifiés tentant d'accéder à `/login` ou `/register` vers le tableau de bord.
- **FR-011**: Le système DOIT permettre à l'utilisateur de modifier son nom affiché depuis la page profil. L'adresse email est affichée en lecture seule et ne peut pas être modifiée en v1.
- **FR-012**: Le système DOIT permettre à l'utilisateur de choisir sa langue préférée (français ou anglais) depuis la page profil.
- **FR-013**: Le système DOIT normaliser les adresses email (insensible à la casse) à l'inscription et à la connexion.
- **FR-014**: Le système DOIT rejeter les soumissions de formulaire multiples simultanées (protection double-submit).
- **FR-015**: Le système DOIT afficher des erreurs de validation inline, sans rechargement de page.

### Key Entities

- **Utilisateur** : entité principale — email (identifiant unique), mot de passe (stocké de manière sécurisée, jamais en clair), nom affiché, langue préférée (fr/en), date de création.
- **Session** : représente une connexion active d'un utilisateur sur un appareil donné — un utilisateur peut avoir plusieurs sessions simultanées (multi-appareils). Chaque session a sa propre durée de vie et son propre cycle d'invalidation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur peut créer un compte et accéder au tableau de bord en moins de 2 minutes.
- **SC-002**: Un utilisateur peut se connecter à son compte existant en moins de 30 secondes.
- **SC-003**: 100% des pages protégées sont inaccessibles sans authentification valide.
- **SC-004**: Les erreurs de validation sont visibles en moins d'1 seconde après la soumission d'un formulaire invalide.
- **SC-005**: La session persiste au moins 7 jours sans reconnexion requise pour un usage normal.
- **SC-006**: Un utilisateur déconnecté ne peut plus accéder aux données protégées, même avec l'URL directe.
- **SC-007**: Les modifications de profil (nom, langue) sont sauvegardées et visibles en moins de 3 secondes.

## Assumptions

- L'application cible principalement des utilisateurs français avec une option anglais — pas d'autres langues en v1.
- Pas de connexion sociale (Google, Apple, etc.) en v1 — email/password uniquement.
- Pas de fonctionnalité "mot de passe oublié" en v1 (hors scope — peut être ajoutée en patch ultérieur).
- Pas de vérification d'email par lien de confirmation en v1 (l'inscription crée directement un compte actif).
- Un utilisateur = un seul compte (pas de multi-compte sur la même email).
- Les sessions inactives expirent automatiquement après une période raisonnable (valeur par défaut : 30 jours glissants).
- **Same-origin requis** : le frontend et l'API doivent être servis depuis le même domaine dans tous les environnements — condition nécessaire au fonctionnement des cookies SameSite=Strict. En production : rewrites Vercel (`/api/*` → backend, `/*` → SPA). En développement : proxy local frontend vers le backend.

## Clarifications

### Session 2026-02-22

- Q: Comment le token de session est-il transmis entre le client et le serveur ? → A: Cookie HTTP-only + Secure + SameSite=Strict. Déploiement same-origin obligatoire (rewrites Vercel `/api/*` → backend `kasa-back.vercel.app` ; proxy Vite en développement).
- Q: Quel mécanisme de protection contre le brute-force à la connexion ? → A: Blocage temporaire progressif — verrou 15 min après 5 échecs consécutifs, sans notification email.
- Q: Règles de complexité du mot de passe au-delà de 8 caractères ? → A: 8 caractères minimum + indicateur visuel de robustesse (faible/moyen/fort) en temps réel, non bloquant.
- Q: L'email est-il modifiable depuis la page profil ? → A: Non — email figé en v1, affiché en lecture seule. Modifiable uniquement dans une version ultérieure avec confirmation par lien.
- Q: Sessions simultanées sur plusieurs appareils autorisées ? → A: Oui — sessions multiples autorisées, déconnexion invalide uniquement la session courante.
