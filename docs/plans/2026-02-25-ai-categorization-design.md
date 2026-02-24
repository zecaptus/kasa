# Design : Catégorisation IA hybride

**Date** : 2026-02-25
**Scope** : Backend complet + Frontend complet
**Branche** : `claude/ai-categorization-feature-51A4B`

---

## 1. Data Model

Migration Prisma additive — ajout de `AI` à l'enum `CategorySource` :

```prisma
enum CategorySource {
  NONE
  AUTO
  AI      // NEW
  MANUAL
}
```

Pas de nouveau modèle. Le champ `categorySource` existant sur `ImportedTransaction` et `ManualExpense` suffit. Quand l'IA catégorise : `categorySource: AI` + `categoryId`. Pas de `categoryRuleId` (lien indirect via auto-learning).

**Hiérarchie** : `MANUAL > AI > AUTO > NONE` — `bulkCategorizeTransactions` doit skipper `AI` en plus de `MANUAL`.

---

## 2. Backend Architecture

### Nouveaux fichiers

**`backend/src/services/aiCategorization.service.ts`** :
- `aiCategorizeBatch(userId, transactions[])` — point d'entrée
  - Filtre les transactions `NONE` uniquement
  - Découpe en batches de 30 max (contrainte Vercel 10s)
  - Appelle le provider LLM avec le prompt batch
  - Parse la réponse JSON (validation zod)
  - Met à jour les transactions (`categorySource: AI`, `categoryId`)
  - Auto-learning : si `confidence >= 0.9` et keyword extrait → crée `CategoryRule` (user, pas system)
  - Invalide le cache de règles après création

**`backend/src/services/aiProvider.ts`** — Abstraction provider avec fallback :
- Interface `AiProvider` : `categorize(prompt) → string`
- `GeminiProvider` : SDK `@google/generative-ai`, modèle `gemini-2.0-flash`
- `GroqProvider` : API REST Groq, modèle `llama-3.1-8b-instant`
- Logique fallback : Gemini d'abord, si erreur/timeout → Groq automatiquement

### Config (`config.ts`)

Champs optionnels via zod :
- `GEMINI_API_KEY` — optionnel
- `GROQ_API_KEY` — optionnel
- `AI_CATEGORIZATION_ENABLED` — default `false`, activé si au moins une clé présente

### Intégration import

Dans `import.service.ts`, après `bulkCategorizeTransactions` :

```typescript
const uncategorized = txs.filter(t => t.categorySource === 'NONE')
if (aiEnabled && uncategorized.length > 0) {
  await aiCategorizeBatch(userId, uncategorized)
}
```

### Nouvelle route

`POST /api/categories/ai-categorize` — catégorisation on-demand des transactions NONE
`GET /api/categories/ai-status` — retourne `{ enabled: boolean }`

---

## 3. Prompt Design & Parsing

Prompt dynamique avec les catégories réelles de l'utilisateur :

```
Tu es un assistant de catégorisation de transactions bancaires françaises.
Catégories disponibles (id → nom) :
- "abc123" → Alimentation
- "def456" → Transport
[... catégories système + user]

Pour chaque transaction, retourne UNIQUEMENT un JSON valide :
{ "results": [{ "index": 0, "categoryId": "abc123", "confidence": 0.95, "keyword": "carrefour" }] }

Règles :
- confidence entre 0.0 et 1.0
- keyword : le mot-clé principal qui justifie la catégorisation (minuscule, sans accents)
- Si incertain (confidence < 0.5), utilise categoryId: null

Transactions :
0: "CB CARREFOUR MARKET 15/01"
1: "VIR SEPA JEAN DUPONT LOYER FEVRIER"
```

- On envoie les `categoryId` réels → pas de mapping fragile
- Validation zod stricte de la réponse JSON
- Extraction JSON via regex `\{[\s\S]*\}` si texte autour
- Batches de 30 transactions max

---

## 4. Frontend

### Badge IA

Sur `UnifiedTransactionList`, quand `categorySource === 'AI'` :
- Icône `Sparkles` (lucide-react), 14px, couleur accent violet/indigo
- Tooltip i18n "Catégorisé par IA"

### Bouton "Catégoriser avec l'IA"

Sur la page Transactions :
- Visible si `AI_CATEGORIZATION_ENABLED` (via `GET /api/categories/ai-status`)
- Bouton secondaire avec icône Sparkles
- Au clic : `POST /api/categories/ai-categorize` → spinner logo Kasa → refresh liste
- Désactivé si aucune transaction `NONE`

### RTK Query

Nouveaux endpoints dans `transactionsApi.ts` :
- `aiCategorize` : mutation POST
- `getAiStatus` : query GET
- Invalidation tags `Transaction` + `CategoryRule`

### i18n

- `categories.ai.badge` : "Catégorisé par IA" / "Categorized by AI"
- `categories.ai.button` : "Catégoriser avec l'IA" / "Categorize with AI"
- `categories.ai.success` : "{count} transactions catégorisées" / "{count} transactions categorized"

---

## 5. Graceful Degradation

- **Sans clé API** : système fonctionne comme avant. Bouton masqué, import sans IA.
- **Fallback Gemini → Groq** : si Gemini échoue, retry Groq. Si les deux échouent, log + transactions restent `NONE`.
- **Réponse IA invalide** : validation zod. Index/categoryId invalide → skip cette transaction, pas de crash batch.
- **Pas de retry agressif** : un seul retry via fallback. L'utilisateur peut relancer manuellement.

---

## Dépendances npm

- `@google/generative-ai` — SDK Gemini (backend)
- Groq : appel REST natif (fetch), pas de SDK supplémentaire

## Résumé des fichiers touchés

| Fichier | Action |
|---------|--------|
| `packages/db/prisma/schema.prisma` | Ajout `AI` à enum |
| `backend/src/config.ts` | 3 nouvelles env vars optionnelles |
| `backend/src/services/aiProvider.ts` | NOUVEAU — providers LLM |
| `backend/src/services/aiCategorization.service.ts` | NOUVEAU — orchestration batch |
| `backend/src/services/categorization.service.ts` | Skip `AI` dans bulk |
| `backend/src/services/import.service.ts` | Appel IA post-import |
| `backend/src/routes/categories.router.ts` | 2 nouvelles routes |
| `frontend/src/services/transactionsApi.ts` | 2 nouveaux endpoints |
| `frontend/src/components/UnifiedTransactionList.tsx` | Badge IA |
| `frontend/src/pages/TransactionsPage.tsx` | Bouton IA |
| `frontend/src/i18n/fr.json` | Nouvelles clés |
| `frontend/src/i18n/en.json` | Nouvelles clés |
