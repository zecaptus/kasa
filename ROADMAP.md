# Kasa — Roadmap

> Dernière mise à jour : 2026-02-22
> Workflow : `speckit.specify → clarify → plan → tasks → implement` par feature.
> Chaque feature correspond à une branche `###-short-name` et une PR vers `main`.

---

## Vue d'ensemble

```
Phase 1 — Fondations         002-user-management
Phase 2 — Import CSV         003-csv-import
Phase 3 — Transactions       004-transactions
Phase 4 — Dashboard          005-dashboard
Phase 5 — Cagnottes          006-virtual-pockets
Phase 6 — Scan ticket        007-receipt-scan
Phase 7 — PWA                008-pwa
```

Les phases sont séquentielles : chaque phase dépend de la précédente.
Les numéros de features sont réservés ; les specs seront créées avant chaque implémentation.

---

## Phase 1 — Fondations · `002-user-management`

**Objectif** : socle auth — sans ça, rien d'autre n'est possible.

### Périmètre
- Inscription email/password avec validation (zod)
- Connexion / déconnexion — JWT (access token + refresh token)
- Profil utilisateur (nom, avatar, locale préférée)
- Protection des routes API (middleware auth Koa)
- Frontend : pages Login, Register, profil — mobile-first, react-intl, Redux Toolkit (auth slice)

### Décisions techniques à prendre en spec
- Stockage des tokens côté client : `httpOnly cookie` vs `localStorage` (recommandé : httpOnly)
- Stratégie refresh token (rotation, durée de vie)

### Dépendances
- Aucune (premier bloc fonctionnel)

---

## Phase 2 — Import CSV · `003-csv-import`

**Objectif** : importer les transactions depuis un export CSV SG et les associer aux dépenses saisies manuellement.

### Périmètre
- Upload d'un fichier CSV exporté depuis l'espace client SG (format OFX/CSV SG)
- Parsing et normalisation des transactions importées
- Saisie manuelle de dépenses (montant, libellé, date, catégorie)
- **Rapprochement automatique** : association transaction CSV ↔ dépense manuelle sur critères (montant exact, date proche, libellé similaire)
- **Résolution des ambiguïtés** : si plusieurs correspondances possibles, demander confirmation à l'utilisateur (UI de sélection)
- Marquage des transactions rapprochées / non rapprochées / ignorées
- Frontend : page d'import (drag & drop CSV), page de saisie manuelle, interface de rapprochement — RTK Query

### Décisions techniques à prendre en spec
- Format CSV SG : colonnes, encodage, séparateur (à analyser sur un export réel)
- Algorithme de rapprochement : seuils de tolérance (montant ±0 €, date ±3 j, similarité libellé Levenshtein ?)
- Stratégie de déduplication en cas de ré-import
- Schéma Prisma : `ImportedTransaction`, `ManualExpense`, `Reconciliation`

### Dépendances
- Phase 1 (utilisateur authentifié requis)

---

## Phase 3 — Transactions · `004-transactions`

**Objectif** : lister, catégoriser et filtrer les transactions (CSV importées + saisies manuelles).

### Périmètre
- Vue unifiée des transactions (importées CSV + manuelles)
- Catégorisation automatique (règles heuristiques ou ML léger)
- Catégories personnalisables par l'utilisateur
- Filtres : période, compte, catégorie, montant
- Recherche plein texte sur le libellé
- Frontend : liste paginée, filtres, détail transaction — RTK Query

### Décisions techniques à prendre en spec
- Stratégie de catégorisation automatique (règles regex, API externe, modèle embarqué)
- Pagination : cursor-based vs offset
- Schéma Prisma : `Transaction`, `Category`, `CategoryRule`

### Dépendances
- Phase 2 (transactions importées CSV + dépenses manuelles)

---

## Phase 4 — Dashboard · `005-dashboard`

**Objectif** : vue d'ensemble claire de la situation financière.

### Périmètre
- Cards par compte : solde actuel, variation mensuelle, dernières transactions
- Graphique de dépenses par catégorie (mois en cours vs mois précédent)
- Indicateur global : solde total, dépenses du mois, budget restant
- Responsive : layout 1 colonne mobile → grille desktop
- Frontend : composants Card, Chart, Skeleton loading — RTK Query, react-intl (formatage devise)

### Décisions techniques à prendre en spec
- Librairie de graphiques (Recharts, Chart.js, Nivo…)
- Calculs côté serveur vs côté client
- SLO : dashboard chargé en < 1,5 s (P95)

### Dépendances
- Phase 3 (transactions catégorisées)

---

## Phase 5 — Cagnottes · `006-virtual-pockets`

**Objectif** : système de sous-comptes virtuels pour les objectifs d'épargne.

### Périmètre
- Création de cagnottes liées au Livret A (nom, objectif, couleur/icône)
- Affectation manuelle d'un montant à une cagnotte
- Indicateur de progression (montant atteint / objectif)
- Card "cagnotte" imbriquée visuellement sous la card Livret A sur le dashboard
- Historique des mouvements par cagnotte

### Décisions techniques à prendre en spec
- Les cagnottes sont **virtuelles** : pas de vrai sous-compte bancaire, uniquement en base Kasa
- Schéma Prisma : `Pocket`, `PocketTransaction`
- Gestion du cas où le solde Livret A < somme des cagnottes (alerte ?)

### Dépendances
- Phase 4 (dashboard — les cagnottes s'y intègrent visuellement)

---

## Phase 6 — Scan ticket · `007-receipt-scan`

**Objectif** : photographier un ticket de caisse depuis mobile et catégoriser automatiquement les dépenses.

### Périmètre
- Capture photo via l'API caméra du navigateur (`getUserMedia` / `<input capture>`)
- OCR du ticket : extraction du montant total, de la date, du magasin et des lignes articles
- Association automatique à une transaction bancaire existante (rapprochement)
- Création d'une transaction manuelle si aucun rapprochement trouvé
- Catégorisation des articles par ligne (alimentation, hygiène, etc.)
- Frontend : interface de scan mobile, résumé éditable avant validation

### Décisions techniques à prendre en spec
- **Moteur OCR** : Tesseract.js (client, gratuit, ~4 MB WASM) vs Google Vision API vs AWS Textract
  - Tesseract.js : offline, pas de coût API, moins précis sur tickets FR
  - Google Vision : très précis, 1000 req/mois gratuites, dépendance externe
- Traitement côté client vs côté serveur
- Format de stockage des tickets (image + JSON structuré)

### Dépendances
- Phase 3 (transactions existantes pour le rapprochement)

---

## Phase 7 — PWA · `008-pwa`

**Objectif** : transformer l'app en PWA installable et partiellement offline.

### Périmètre
- Service worker via `vite-plugin-pwa` (stratégie cache-first pour assets statiques)
- Manifest web (`name`, `icons`, `theme_color`, `display: standalone`)
- Install prompt (bouton "Ajouter à l'écran d'accueil")
- Offline : dashboard en lecture seule depuis le cache, message d'état réseau
- Notifications push (optionnel — si budget / scope le permet)
- Test iOS Safari (limitations : pas de push notifications sur iOS < 16.4)

### Décisions techniques à prendre en spec
- Stratégie cache pour les données API RTK Query (stale-while-revalidate ?)
- Gestion du background sync pour les scans en attente (Phase 6)

### Dépendances
- Phase 4+ (dashboard fonctionnel à mettre en cache)
- Phase 6 (background sync des scans)

---

## Décisions transversales ouvertes

| # | Sujet | Options | À décider en |
|---|---|---|---|
| D1 | Format CSV SG | Analyser export réel : colonnes, encodage, séparateur | spec 003 |
| D2 | Moteur OCR | Tesseract.js vs Google Vision vs AWS Textract | spec 007 |
| D3 | Librairie graphiques dashboard | Recharts vs Chart.js vs Nivo | spec 005 |
| D4 | Algorithme de rapprochement | Seuils montant/date/libellé (Levenshtein ?) | spec 003 |
| D5 | Push notifications PWA | Inclus ou hors scope v1 | spec 008 |

---

## Stack frontend (arrêté)

| Rôle | Technologie |
|---|---|
| UI | React 19 + Tailwind CSS 4 |
| i18n | react-intl (FormatJS) — aucune chaîne en dur |
| State client | Redux Toolkit (slices) |
| State serveur | RTK Query (endpoints déclaratifs, cache Redux) |
| Class names | clsx + tailwind-merge via `cn()` — syntaxe objet pour conditionnels |
| PWA | vite-plugin-pwa |
| Build | Vite 6 |
