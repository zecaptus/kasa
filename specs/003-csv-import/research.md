# Research Notes: CSV Import & Transaction Reconciliation

**Branch**: `003-csv-import`
**Phase**: 0 — Research
**Date**: 2026-02-22

---

## D1 — Format CSV Société Générale

### Décision

Parser les fichiers CSV SG avec les caractéristiques suivantes (confirmées) :

| Propriété | Valeur |
|---|---|
| Séparateur | Semicolon (`;`) |
| Encodage | Windows-1252 (détecter BOM UTF-8 comme fallback) |
| Format de date | `DD/MM/YYYY` |
| Séparateur décimal | Virgule (`,`) |
| Séparateur milliers | Aucun |
| Symbole monnaie | Absent des colonnes montant |

**Format 5 colonnes** (compte courant — format principal) :

```
Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit
```

- `Débit` : montant en valeur positive (ex. `42,50`) — vide si opération créditrice
- `Crédit` : montant en valeur positive — vide si opération débitrice
- Une et une seule des deux colonnes est remplie par ligne

**Format 4 colonnes** (Livret A / LEP / LDD) :

```
Date;Libellé;Montant;Devise
```

- `Montant` : valeur signée (négatif = débit, positif = crédit)
- `Devise` : toujours `EUR`

**Structure du fichier** :

```
[Ligne preamble optionnelle]    ← numéro de compte ou vide
Date de comptabilisation;...    ← en-tête colonnes
15/01/2025;15/01/2025;PAIEMENT PAR CARTE...;42,50;
14/01/2025;14/01/2025;VIR SEPA RECU DE...;;2500,00
[Ligne footer optionnelle]      ← "Solde au DD/MM/YYYY;montant;;"
```

Le parser doit détecter l'en-tête par scan des noms de colonnes (non par position de ligne) et ignorer toute ligne dont le nombre de colonnes ne correspond pas à l'en-tête détecté.

### Rationale

Synthèse depuis : importers open-source (HomeBank preset SG, Firefly III SG importer, Kresus), forums finance personnelle FR (reddit r/vosfinances, developpez.com), portail d'aide SG. Confiance haute sur le format 5 colonnes compte courant. Confiance moyenne sur le variant 4 colonnes livret.

### Implémentation parser

```
Buffer (multipart upload)
  → iconv-lite.decode(buffer, 'windows-1252')   // ou UTF-8 si BOM détecté
  → csv-parse (delimiter: ';', skipEmptyLines: true)
  → scan header row → détecter variant (5-col ou 4-col)
  → mapper chaque data row → { accountingDate, valueDate?, label, debit?, credit? }
  → skip rows dont le count de colonnes ≠ header count (footer lines)
  → normaliser amounts : parseFloat(raw.replace(',', '.'))
```

### Alternatives considérées

- **Format OFX** : SG n'exporte pas nativement en OFX depuis son portail standard
- **Open Banking API / PSD2** : nécessite licence AISP, hors scope Phase 2

---

## D4 — Algorithme de similarité pour le rapprochement libellés

### Décision

**Algorithme hybride** : `max(tokenSetRatio, bigramDice)` avec pré-traitement obligatoire

**Package** : `talisman` v^0.21.0 — uniquement `talisman/metrics/dice` (tree-shakeable, héritage NLP français, maintenance active, types TypeScript built-in, ~450 KB unpacked)

### Pipeline de pré-traitement

Le pré-traitement représente 80 % du gain de précision.

**Étape 1 — Supprimer les préfixes SEPA/CFONB du libellé bancaire** :

```typescript
const BANK_PREFIXES = [
  'VIR SEPA', 'VIR INST', 'VIR TRESO',
  'PRLV SEPA', 'PRLV EUROPEEN',
  'CB ', 'RETRAIT DAB', 'RETRAIT CB',
  'AVOIR CB', 'ANNUL VIR', 'REMISE CB',
  'VIREMENT DE', 'VIREMENT A', 'VIREMENT RECU',
  'ECHEANCE', 'PRELEVEMENT SEPA',
  'CHEQUE', 'REM CHQ',
];
```

**Étape 2 — Normaliser les deux chaînes** :
```
NFD-decompose → strip diacritics → lowercase → strip punctuation → collapse spaces
```

**Étape 3 — Score dual** :
- **Token-set ratio** : `|intersection| / |smallerSet|` — gère le cas « libellé utilisateur = sous-ensemble du libellé bancaire »
- **Bigram Dice** : `1 - diceDistance(a, b)` — gère les abréviations et fautes de frappe

**Score final** : `max(tokenSetRatio, bigramDice)`

### Seuils de confiance

| Score | Confiance | Action |
|---|---|---|
| ≥ 0.85 | Haute | Auto-réconcilié, aucune confirmation utilisateur |
| 0.60–0.84 | Plausible | Proposé à l'utilisateur pour confirmation |
| 0.40–0.59 | Faible | Candidat bas de liste uniquement |
| < 0.40 | Aucune | Écarté |

### Exemples de scores (après pré-traitement)

| Libellé bancaire | Libellé utilisateur | Token-set | Bigram Dice | Final | Confiance |
|---|---|---|---|---|---|
| `VIR SEPA LOYER MARS` | `Loyer mars` | 1.00 | 1.00 | 1.00 | haute |
| `AMAZON EU` | `Amazon` | 1.00 | ~0.67 | 1.00 | haute |
| `PRLV SEPA EDF SA REF 20240301` | `EDF` | 1.00 | ~0.29 | 1.00 | haute |
| `CB CARREFOUR MARKET` | `Carrefur market` | 0.50 | ~0.74 | 0.74 | plausible |
| `VIR SEPA SALAIRE JANVIER` | `Loyer` | 0.00 | ~0.10 | 0.10 | aucune |

### Alternatives considérées

- **Levenshtein pur** : pénalise trop les différences de longueur — écarté
- **Jaro-Winkler** : biaisé vers les préfixes communs (inverse du comportement souhaité pour les libellés SEPA) — écarté
- **`string-similarity` npm** : abandonné depuis 2021, pas d'ESM — écarté
- **`natural` npm** : 8 MB, stemmer français utile en phase 3 mais surdimensionné ici — déféré

---

## Librairie de parsing CSV

### Décision

**`csv-parse`** (package `csv` par Adaltas, v5.x) + **`iconv-lite`** pour décodage Windows-1252

### Rationale

- `csv-parse` : standard Node.js de facto, mature (>10 ans), stream + API synchrone, gère les champs quotés et les newlines embarqués, types TypeScript inclus
- `iconv-lite` : ~50 KB, sans bindings natifs, décode Windows-1252 depuis un `Buffer` Node.js

### Commandes d'installation

```bash
pnpm --filter backend add csv-parse iconv-lite talisman
pnpm --filter backend add -D @types/multer
pnpm --filter backend add @koa/multer
```

---

## Upload fichier dans Koa

### Décision

**`@koa/multer`** avec stockage en mémoire (`multer.memoryStorage()`)

### Rationale

- Package officiel @koa/ — maintenu avec Koa
- Stockage mémoire : le buffer CSV est accessible dans le handler sans écriture disque — cohérent avec la décision Q2 (fichier non conservé après parsing)
- Limite 5 MB enforced via `multer({ limits: { fileSize: 5 * 1024 * 1024 } })`
- Types via `@types/multer` (déjà nécessaire pour multer)
