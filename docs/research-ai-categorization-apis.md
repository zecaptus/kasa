# Etude : Catégorisation IA gratuite pour Kasa

**Date** : 2026-02-24

## 1. Etat actuel du système

Le système de catégorisation actuel est 100% basé sur des règles (`categorization.service.ts`) :

- **6 catégories système** : Alimentation, Transport, Logement, Santé, Loisirs, Autre
- **~30 règles système** (keywords : "carrefour" → Alimentation, "sncf" → Transport, etc.)
- **Matching** : exact (substring) + fuzzy (Dice coefficient >= 0.75 via talisman)
- **3 sources** : `NONE` (non catégorisé), `AUTO` (par règle), `MANUAL` (par l'utilisateur)
- **Suggestion de règles** : analyse les transactions non-catégorisées et suggère les keywords fréquents

**Limitation principale** : si un libellé bancaire ne contient aucun mot-clé connu (ex: "VIR SEPA 12345 REF XYZ"), la transaction reste en `NONE`. C'est là que l'IA intervient.

---

## 2. Contraintes Vercel Free Tier

| Contrainte | Limite |
|------------|--------|
| Timeout serverless function | 10 secondes |
| Mémoire | 1024 MB |
| Invocations/mois | 100 000 |
| Bandwidth | 100 GB |

Le timeout de 10s est la contrainte critique : il faut un LLM rapide avec des appels légers.

---

## 3. Options d'API LLM gratuites

| Provider | Modèle recommandé | RPM | RPD | Tokens/jour | Latence | Verdict |
|----------|-------------------|-----|-----|-------------|---------|---------|
| **Google AI Studio** | Gemini 2.0 Flash | illimité* | 1 500 | ~1M tokens/min | ~1-2s | **Meilleur choix** |
| **Groq** | Llama 3.1 8B Instant | 30 | 14 400 | 500 000 | <1s | Excellent backup |
| **Mistral** | Mistral Small | limité | — | 1B tokens/mois | ~2s | Bon mais données d'entraînement |
| **Cerebras** | Llama 3.3 70B | 30 | illimité | 1M | <0.5s | Rapide mais limité en RPM |
| **OpenRouter** | Free router | — | 50 | — | variable | Trop limité |
| **Cohere** | Classify | 20 | — | 1 000/mois total | ~1s | Trop limité |

### Recommandation : Google Gemini 2.0 Flash (via AI Studio)

- **1 500 requêtes/jour gratuit** — largement suffisant pour un usage personnel
- Temps de réponse rapide (~1s), compatible avec le timeout Vercel de 10s
- Modèle performant pour la classification de texte court
- SDK officiel `@google/generative-ai` (TypeScript)
- **Groq comme fallback** en cas d'indisponibilité

---

## 4. Architecture proposée

```
┌─────────────────────────────────────────────────────────┐
│                Import CSV / Recategorize                │
│                                                         │
│  1. Rules existantes (exact + fuzzy)  ← rapide, gratuit│
│     ↓ transactions encore NONE                          │
│  2. AI Categorization (Gemini Flash)  ← batch, LLM     │
│     ↓ résultat                                          │
│  3. Auto-création de règle            ← apprentissage   │
└─────────────────────────────────────────────────────────┘
```

### Principe hybride : Rules-first, AI-fallback

1. **D'abord les règles** (existant, inchangé) — gratuit, instantané
2. **Ensuite l'IA** sur les transactions restantes en `NONE` — batch de 20-50 labels par appel
3. **Auto-apprentissage** : quand l'IA catégorise avec confiance >= 0.9, créer automatiquement une `CategoryRule` pour que la prochaine fois, la règle suffise sans appel IA

Cela signifie que **l'IA s'utilise de moins en moins** au fil du temps car chaque catégorisation réussie génère une règle.

---

## 5. Design du prompt (batch)

Un seul appel pour N transactions non-catégorisées :

```
Tu es un assistant de catégorisation de transactions bancaires françaises.
Catégories disponibles : Alimentation, Transport, Logement, Santé, Loisirs, Autre

Pour chaque transaction, retourne un JSON :
{ "results": [{ "index": 0, "category": "Alimentation", "confidence": 0.95, "keyword": "carrefour" }] }

Transactions :
0: "CB CARREFOUR MARKET 15/01"
1: "VIR SEPA JEAN DUPONT LOYER FEVRIER"
2: "PRLV FREE MOBILE"
```

**Avantages du batch** :

- 1 appel = 20-50 transactions catégorisées
- Consomme ~200 tokens par batch → 1 500 RPD = ~30 000-75 000 transactions/jour
- Réponse structurée JSON → parsing fiable

---

## 6. Nouveau CategorySource

Ajouter une valeur `AI` à l'enum `CategorySource` :

```prisma
enum CategorySource {
  NONE
  AUTO    // matched by keyword rule
  AI      // categorized by LLM
  MANUAL  // set by user
}
```

**Hiérarchie de priorité** : `MANUAL` > `AI` > `AUTO` > `NONE`

---

## 7. Schéma d'intégration côté backend

```
backend/src/services/
├── categorization.service.ts      # existant (rules)
├── aiCategorization.service.ts    # NOUVEAU — appel Gemini
└── aiCategorization.config.ts     # NOUVEAU — clé API via env
```

Nouveau flow dans `import.service.ts` :

```typescript
// 1. Import CSV → insert transactions
// 2. bulkCategorizeTransactions(userId, txs)  // rules (existant)
// 3. const uncategorized = txs.filter(t => t.categorySource === 'NONE')
// 4. await aiCategorizeBatch(userId, uncategorized)  // NEW
```

Configuration (ajout à `config.ts` via zod, optionnel) :

```
GEMINI_API_KEY=...          # Google AI Studio (gratuit)
GROQ_API_KEY=...            # Fallback (gratuit)
AI_CATEGORIZATION_ENABLED=true
```

---

## 8. Boucle d'apprentissage automatique

Quand l'IA catégorise avec `confidence >= 0.9` et extrait un keyword :

1. Vérifier qu'aucune `CategoryRule` identique n'existe
2. Créer une `CategoryRule` avec `isSystem: false`, `userId`
3. Invalider le cache de règles

**Résultat** : la prochaine transaction similaire sera catégorisée par la règle (gratuit, instantané) sans appeler l'IA.

---

## 9. Frontend — UX

- Badge visuel distinct pour les transactions catégorisées par IA (icône sparkle / "IA")
- Bouton "Catégoriser avec l'IA" sur la page transactions (appel on-demand)
- Catégorisation auto à l'import (si `AI_CATEGORIZATION_ENABLED`)
- L'utilisateur peut corriger → passe en `MANUAL` (comme aujourd'hui)

---

## 10. Estimation des coûts (gratuit)

Pour un utilisateur typique (~500 transactions/mois) :

| Etape | Couvert par règles | Nécessite IA | Appels Gemini |
|-------|-------------------|--------------|---------------|
| Mois 1 | ~60% (300) | ~40% (200) | ~4-10 appels |
| Mois 3 | ~85% (425) | ~15% (75) | ~2-4 appels |
| Mois 6+ | ~95%+ (475) | ~5% (25) | ~1 appel |

Avec 1 500 RPD Gemini gratuit, même plusieurs utilisateurs restent largement dans les limites.

---

## 11. Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Clé API absente | Feature désactivée gracefully (`AI_CATEGORIZATION_ENABLED`) |
| Rate limit atteint | Queue avec retry + exponential backoff |
| Timeout Vercel 10s | Batch de max 30 transactions par appel |
| Mauvaise catégorisation IA | Seuil de confiance (0.9) pour auto-rule ; sinon juste `AI` sans règle |
| Gemini down | Fallback Groq automatique |
| Google change ses limites | Le système fonctionne toujours en mode rules-only |

---

## Résumé

L'approche hybride **Rules-first + AI-fallback + auto-learning** est la plus adaptée :

1. **Gratuit** : Gemini Flash (1 500 RPD) + Groq backup
2. **Compatible Vercel free** : appels <2s, bien sous les 10s de timeout
3. **Auto-améliorant** : l'IA crée des règles, donc s'appelle de moins en moins
4. **Graceful degradation** : sans clé API, le système existant fonctionne normalement
5. **Pas de dépendance lourde** : juste un SDK HTTP léger, pas de ML local
