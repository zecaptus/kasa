# AI Categorization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add hybrid AI categorization (Rules-first + Gemini/Groq fallback + auto-learning) to categorize transactions that rules can't match.

**Architecture:** New `aiProvider.ts` abstracts Gemini/Groq behind a common interface with automatic fallback. New `aiCategorization.service.ts` orchestrates batch prompting, response parsing, DB updates, and auto-rule creation. Integrates into existing import flow and exposes on-demand route. Frontend gets AI badge + categorize button.

**Tech Stack:** `@google/generative-ai` (Gemini SDK), native `fetch` (Groq), Prisma migration, zod validation, RTK Query, lucide-react icons.

---

### Task 1: Prisma Migration — Add `AI` to `CategorySource` enum

**Files:**
- Modify: `packages/db/prisma/schema.prisma:22-26`

**Step 1: Update the enum**

In `packages/db/prisma/schema.prisma`, change:

```prisma
enum CategorySource {
  NONE
  AUTO
  MANUAL
}
```

to:

```prisma
enum CategorySource {
  NONE
  AUTO
  AI
  MANUAL
}
```

**Step 2: Create and apply migration**

Run:
```bash
pnpm --filter @kasa/db run db:migrate -- --name add_ai_category_source
```

Expected: Migration created and applied successfully.

**Step 3: Regenerate Prisma client**

Run:
```bash
pnpm --filter @kasa/db run db:generate
```

Expected: Prisma client regenerated with new `AI` enum value.

**Step 4: Verify typecheck passes**

Run:
```bash
pnpm typecheck
```

Expected: No errors.

**Step 5: Commit**

```bash
git add packages/db/prisma/
git commit -m "feat(db): add AI value to CategorySource enum"
```

---

### Task 2: Backend Config — Add optional AI env vars

**Files:**
- Modify: `backend/src/config.ts`

**Step 1: Write the test**

Create `backend/tests/unit/services/config.ai.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('AI config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have AI disabled by default when no keys', async () => {
    // Set minimum required env vars
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    const { config } = await import('../../../src/config.js');
    expect(config.AI_CATEGORIZATION_ENABLED).toBe(false);
    expect(config.GEMINI_API_KEY).toBeUndefined();
    expect(config.GROQ_API_KEY).toBeUndefined();
  });

  it('should parse GEMINI_API_KEY when provided', async () => {
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.AI_CATEGORIZATION_ENABLED = 'true';
    const { config } = await import('../../../src/config.js');
    expect(config.GEMINI_API_KEY).toBe('test-gemini-key');
    expect(config.AI_CATEGORIZATION_ENABLED).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /home/captus/Projects/kasa && pnpm --filter @kasa/backend run test -- --run backend/tests/unit/services/config.ai.test.ts
```

Expected: FAIL — `AI_CATEGORIZATION_ENABLED` not in config.

**Step 3: Update config.ts**

In `backend/src/config.ts`, add 3 new fields to `envSchema`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_TEST: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  // AI categorization (optional — feature disabled if keys absent)
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  AI_CATEGORIZATION_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const config = envSchema.parse(process.env);
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /home/captus/Projects/kasa && pnpm --filter @kasa/backend run test -- --run backend/tests/unit/services/config.ai.test.ts
```

Expected: PASS.

**Step 5: Run full test suite to check no regressions**

Run:
```bash
pnpm test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/src/config.ts backend/tests/unit/services/config.ai.test.ts
git commit -m "feat(config): add optional AI categorization env vars"
```

---

### Task 3: AI Provider — Gemini + Groq with fallback

**Files:**
- Create: `backend/src/services/aiProvider.ts`
- Test: `backend/tests/unit/services/aiProvider.test.ts`

**Step 1: Install Gemini SDK**

Run:
```bash
pnpm --filter @kasa/backend add @google/generative-ai
```

**Step 2: Write the tests**

Create `backend/tests/unit/services/aiProvider.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @google/generative-ai
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// Mock global fetch for Groq
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  createGeminiProvider,
  createGroqProvider,
  createFallbackProvider,
} from '../../../src/services/aiProvider.js';

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return text from Gemini API', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '{"results": []}' },
    });
    const provider = createGeminiProvider('fake-key');
    const result = await provider.generate('test prompt');
    expect(result).toBe('{"results": []}');
    expect(mockGenerateContent).toHaveBeenCalledWith('test prompt');
  });

  it('should throw on API error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'));
    const provider = createGeminiProvider('fake-key');
    await expect(provider.generate('test')).rejects.toThrow('API error');
  });
});

describe('GroqProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return text from Groq API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"results": []}' } }],
        }),
    });
    const provider = createGroqProvider('fake-key');
    const result = await provider.generate('test prompt');
    expect(result).toBe('{"results": []}');
  });

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });
    const provider = createGroqProvider('fake-key');
    await expect(provider.generate('test')).rejects.toThrow('Groq API error: 429');
  });
});

describe('FallbackProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use primary provider when it succeeds', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '{"results": []}' },
    });
    const provider = createFallbackProvider('gemini-key', 'groq-key');
    const result = await provider.generate('test');
    expect(result).toBe('{"results": []}');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fallback to Groq when Gemini fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini down'));
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"results": [{"index":0}]}' } }],
        }),
    });
    const provider = createFallbackProvider('gemini-key', 'groq-key');
    const result = await provider.generate('test');
    expect(result).toBe('{"results": [{"index":0}]}');
  });

  it('should throw when both providers fail', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini down'));
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    const provider = createFallbackProvider('gemini-key', 'groq-key');
    await expect(provider.generate('test')).rejects.toThrow();
  });
});
```

**Step 3: Run test to verify it fails**

Run:
```bash
cd /home/captus/Projects/kasa && pnpm --filter @kasa/backend run test -- --run backend/tests/unit/services/aiProvider.test.ts
```

Expected: FAIL — module not found.

**Step 4: Implement aiProvider.ts**

Create `backend/src/services/aiProvider.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface AiProvider {
  generate(prompt: string): Promise<string>;
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

export function createGeminiProvider(apiKey: string): AiProvider {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  return {
    async generate(prompt: string): Promise<string> {
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}

// ─── Groq ────────────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function createGroqProvider(apiKey: string): AiProvider {
  return {
    async generate(prompt: string): Promise<string> {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0].message.content;
    },
  };
}

// ─── Fallback ────────────────────────────────────────────────────────────────

export function createFallbackProvider(
  geminiKey: string | undefined,
  groqKey: string | undefined,
): AiProvider {
  const primary = geminiKey ? createGeminiProvider(geminiKey) : null;
  const secondary = groqKey ? createGroqProvider(groqKey) : null;

  return {
    async generate(prompt: string): Promise<string> {
      if (primary) {
        try {
          return await primary.generate(prompt);
        } catch (err) {
          console.warn('[AI] Gemini failed, trying Groq fallback:', (err as Error).message);
          if (!secondary) throw err;
        }
      }
      if (secondary) {
        return secondary.generate(prompt);
      }
      throw new Error('No AI provider configured');
    },
  };
}
```

**Step 5: Run test to verify it passes**

Run:
```bash
cd /home/captus/Projects/kasa && pnpm --filter @kasa/backend run test -- --run backend/tests/unit/services/aiProvider.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/services/aiProvider.ts backend/tests/unit/services/aiProvider.test.ts backend/package.json
git commit -m "feat(ai): add Gemini + Groq provider with automatic fallback"
```

---

### Task 4: AI Categorization Service — Batch prompt, parsing, auto-learning

**Files:**
- Create: `backend/src/services/aiCategorization.service.ts`
- Test: `backend/tests/unit/services/aiCategorization.service.test.ts`

**Step 1: Write the tests**

Create `backend/tests/unit/services/aiCategorization.service.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCategoryFindMany = vi.fn();
const mockRuleFindFirst = vi.fn();
const mockRuleCreate = vi.fn();
const mockTxUpdate = vi.fn();

vi.mock('@kasa/db', () => ({
  prisma: {
    category: { findMany: (...args: unknown[]) => mockCategoryFindMany(...args) },
    categoryRule: {
      findFirst: (...args: unknown[]) => mockRuleFindFirst(...args),
      create: (...args: unknown[]) => mockRuleCreate(...args),
    },
    importedTransaction: { update: (...args: unknown[]) => mockTxUpdate(...args) },
  },
}));

const mockGenerate = vi.fn();
vi.mock('../../../src/services/aiProvider.js', () => ({
  createFallbackProvider: () => ({ generate: mockGenerate }),
}));

vi.mock('../../../src/config.js', () => ({
  config: {
    GEMINI_API_KEY: 'fake-gemini',
    GROQ_API_KEY: 'fake-groq',
    AI_CATEGORIZATION_ENABLED: true,
  },
}));

vi.mock('../../../src/services/categorization.service.js', () => ({
  invalidateRuleCache: vi.fn(),
}));

import {
  buildPrompt,
  parseAiResponse,
  aiCategorizeBatch,
} from '../../../src/services/aiCategorization.service.js';

// ── Test data ────────────────────────────────────────────────────────────────

const categories = [
  { id: 'cat-food', name: 'Alimentation', slug: 'alimentation', color: '#22c55e', isSystem: true, userId: null },
  { id: 'cat-transport', name: 'Transport', slug: 'transport', color: '#3b82f6', isSystem: true, userId: null },
];

const transactions = [
  { id: 'tx-1', label: 'CB CARREFOUR MARKET 15/01', categorySource: 'NONE' },
  { id: 'tx-2', label: 'VIR SEPA LOYER FEVRIER', categorySource: 'NONE' },
  { id: 'tx-3', label: 'Already categorized', categorySource: 'MANUAL' },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  it('should build a prompt with categories and transaction labels', () => {
    const prompt = buildPrompt(categories, [transactions[0], transactions[1]]);
    expect(prompt).toContain('cat-food');
    expect(prompt).toContain('Alimentation');
    expect(prompt).toContain('0: "CB CARREFOUR MARKET 15/01"');
    expect(prompt).toContain('1: "VIR SEPA LOYER FEVRIER"');
  });
});

describe('parseAiResponse', () => {
  it('should parse valid JSON response', () => {
    const raw = '{"results": [{"index": 0, "categoryId": "cat-food", "confidence": 0.95, "keyword": "carrefour"}]}';
    const parsed = parseAiResponse(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].categoryId).toBe('cat-food');
  });

  it('should extract JSON from text with surrounding content', () => {
    const raw = 'Here is the result:\n{"results": [{"index": 0, "categoryId": "cat-food", "confidence": 0.9, "keyword": "carrefour"}]}\nDone!';
    const parsed = parseAiResponse(raw);
    expect(parsed).toHaveLength(1);
  });

  it('should return empty array for invalid JSON', () => {
    const parsed = parseAiResponse('not json at all');
    expect(parsed).toEqual([]);
  });

  it('should filter out results with null categoryId', () => {
    const raw = '{"results": [{"index": 0, "categoryId": null, "confidence": 0.3, "keyword": ""}]}';
    const parsed = parseAiResponse(raw);
    expect(parsed).toEqual([]);
  });
});

describe('aiCategorizeBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoryFindMany.mockResolvedValue(categories);
    mockRuleFindFirst.mockResolvedValue(null);
    mockRuleCreate.mockResolvedValue({ id: 'rule-1' });
    mockTxUpdate.mockResolvedValue({});
  });

  it('should skip non-NONE transactions', async () => {
    mockGenerate.mockResolvedValue(
      '{"results": [{"index": 0, "categoryId": "cat-food", "confidence": 0.95, "keyword": "carrefour"}]}'
    );
    const result = await aiCategorizeBatch('user-1', transactions);
    // Only tx-1 and tx-2 are NONE; tx-3 is MANUAL and skipped
    // AI returns result for index 0 only → 1 categorized
    expect(result.categorized).toBe(1);
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockTxUpdate).toHaveBeenCalledWith({
      where: { id: 'tx-1' },
      data: { categoryId: 'cat-food', categorySource: 'AI' },
    });
  });

  it('should create auto-rule when confidence >= 0.9 and keyword present', async () => {
    mockGenerate.mockResolvedValue(
      '{"results": [{"index": 0, "categoryId": "cat-food", "confidence": 0.95, "keyword": "carrefour"}]}'
    );
    await aiCategorizeBatch('user-1', transactions);
    expect(mockRuleFindFirst).toHaveBeenCalled();
    expect(mockRuleCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        keyword: 'carrefour',
        categoryId: 'cat-food',
        isSystem: false,
      },
    });
  });

  it('should NOT create auto-rule when confidence < 0.9', async () => {
    mockGenerate.mockResolvedValue(
      '{"results": [{"index": 0, "categoryId": "cat-food", "confidence": 0.7, "keyword": "carrefour"}]}'
    );
    await aiCategorizeBatch('user-1', transactions);
    expect(mockRuleCreate).not.toHaveBeenCalled();
  });

  it('should NOT create auto-rule when rule already exists', async () => {
    mockRuleFindFirst.mockResolvedValue({ id: 'existing-rule' });
    mockGenerate.mockResolvedValue(
      '{"results": [{"index": 0, "categoryId": "cat-food", "confidence": 0.95, "keyword": "carrefour"}]}'
    );
    await aiCategorizeBatch('user-1', transactions);
    expect(mockRuleCreate).not.toHaveBeenCalled();
  });

  it('should return 0 categorized when no NONE transactions', async () => {
    const allManual = [{ id: 'tx-3', label: 'Manual', categorySource: 'MANUAL' }];
    const result = await aiCategorizeBatch('user-1', allManual);
    expect(result.categorized).toBe(0);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('should handle AI provider failure gracefully', async () => {
    mockGenerate.mockRejectedValue(new Error('All providers failed'));
    const result = await aiCategorizeBatch('user-1', transactions);
    expect(result.categorized).toBe(0);
    expect(result.error).toBe('All providers failed');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /home/captus/Projects/kasa && pnpm --filter @kasa/backend run test -- --run backend/tests/unit/services/aiCategorization.service.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement aiCategorization.service.ts**

Create `backend/src/services/aiCategorization.service.ts`:

```typescript
import type { Category } from '@kasa/db';
import { prisma } from '@kasa/db';
import { z } from 'zod';
import { config } from '../config.js';
import { createFallbackProvider } from './aiProvider.js';
import { invalidateRuleCache } from './categorization.service.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 30;
const AUTO_RULE_CONFIDENCE_THRESHOLD = 0.9;

// ─── Types ───────────────────────────────────────────────────────────────────

interface TransactionInput {
  id: string;
  label: string;
  categorySource: string;
}

interface AiCategorizeBatchResult {
  categorized: number;
  rulesCreated: number;
  error?: string;
}

// ─── Zod schema for AI response ──────────────────────────────────────────────

const aiResultItemSchema = z.object({
  index: z.number().int().min(0),
  categoryId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  keyword: z.string().default(''),
});

const aiResponseSchema = z.object({
  results: z.array(aiResultItemSchema),
});

// ─── Prompt builder ──────────────────────────────────────────────────────────

export function buildPrompt(
  categories: Pick<Category, 'id' | 'name'>[],
  transactions: Pick<TransactionInput, 'label'>[],
): string {
  const categoryList = categories
    .map((c) => `- "${c.id}" → ${c.name}`)
    .join('\n');

  const transactionList = transactions
    .map((t, i) => `${i}: "${t.label}"`)
    .join('\n');

  return `Tu es un assistant de catégorisation de transactions bancaires françaises.
Catégories disponibles (id → nom) :
${categoryList}

Pour chaque transaction, retourne UNIQUEMENT un JSON valide :
{ "results": [{ "index": 0, "categoryId": "id_categorie", "confidence": 0.95, "keyword": "motcle" }] }

Règles :
- confidence entre 0.0 et 1.0
- keyword : le mot-clé principal qui justifie la catégorisation (minuscule, sans accents)
- Si incertain (confidence < 0.5), utilise categoryId: null

Transactions :
${transactionList}`;
}

// ─── Response parser ─────────────────────────────────────────────────────────

export function parseAiResponse(
  raw: string,
): Array<{ index: number; categoryId: string; confidence: number; keyword: string }> {
  // Extract JSON block from potential surrounding text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = aiResponseSchema.parse(JSON.parse(jsonMatch[0]));
    return parsed.results
      .filter((r): r is typeof r & { categoryId: string } => r.categoryId !== null)
      .map((r) => ({
        index: r.index,
        categoryId: r.categoryId,
        confidence: r.confidence,
        keyword: r.keyword,
      }));
  } catch {
    return [];
  }
}

// ─── Auto-learning ───────────────────────────────────────────────────────────

async function maybeCreateRule(
  userId: string,
  categoryId: string,
  keyword: string,
  confidence: number,
): Promise<boolean> {
  if (confidence < AUTO_RULE_CONFIDENCE_THRESHOLD) return false;
  if (!keyword || keyword.length < 3) return false;

  // Check if a rule with this keyword already exists for user or system
  const existing = await prisma.categoryRule.findFirst({
    where: {
      keyword: { equals: keyword, mode: 'insensitive' },
      OR: [{ userId }, { isSystem: true }],
    },
  });
  if (existing) return false;

  await prisma.categoryRule.create({
    data: { userId, keyword, categoryId, isSystem: false },
  });
  return true;
}

// ─── Main batch function ─────────────────────────────────────────────────────

export async function aiCategorizeBatch(
  userId: string,
  transactions: TransactionInput[],
): Promise<AiCategorizeBatchResult> {
  const uncategorized = transactions.filter((t) => t.categorySource === 'NONE');
  if (uncategorized.length === 0) {
    return { categorized: 0, rulesCreated: 0 };
  }

  // Load user + system categories
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { isSystem: true }] },
    select: { id: true, name: true },
  });

  if (categories.length === 0) {
    return { categorized: 0, rulesCreated: 0 };
  }

  const provider = createFallbackProvider(config.GEMINI_API_KEY, config.GROQ_API_KEY);
  const validCategoryIds = new Set(categories.map((c) => c.id));

  let totalCategorized = 0;
  let totalRulesCreated = 0;

  // Process in batches
  for (let i = 0; i < uncategorized.length; i += BATCH_SIZE) {
    const batch = uncategorized.slice(i, i + BATCH_SIZE);
    const prompt = buildPrompt(categories, batch);

    try {
      const rawResponse = await provider.generate(prompt);
      const results = parseAiResponse(rawResponse);

      for (const result of results) {
        if (result.index < 0 || result.index >= batch.length) continue;
        if (!validCategoryIds.has(result.categoryId)) continue;

        const tx = batch[result.index];
        await prisma.importedTransaction.update({
          where: { id: tx.id },
          data: { categoryId: result.categoryId, categorySource: 'AI' },
        });
        totalCategorized++;

        // Auto-learning: create rule if high confidence
        const created = await maybeCreateRule(
          userId,
          result.categoryId,
          result.keyword,
          result.confidence,
        );
        if (created) totalRulesCreated++;
      }
    } catch (err) {
      console.error('[AI] Batch categorization failed:', (err as Error).message);
      return {
        categorized: totalCategorized,
        rulesCreated: totalRulesCreated,
        error: (err as Error).message,
      };
    }
  }

  // Invalidate rule cache if new rules were created
  if (totalRulesCreated > 0) {
    invalidateRuleCache(userId);
  }

  return { categorized: totalCategorized, rulesCreated: totalRulesCreated };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /home/captus/Projects/kasa && pnpm --filter @kasa/backend run test -- --run backend/tests/unit/services/aiCategorization.service.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/services/aiCategorization.service.ts backend/tests/unit/services/aiCategorization.service.test.ts
git commit -m "feat(ai): add batch AI categorization service with auto-learning"
```

---

### Task 5: Update `bulkCategorizeTransactions` to skip `AI` source

**Files:**
- Modify: `backend/src/services/categorization.service.ts:104`
- Modify: `backend/tests/unit/services/categorization.service.test.ts`

**Step 1: Add test for AI skip behavior**

In `backend/tests/unit/services/categorization.service.test.ts`, add a new test (after existing tests in the `bulkCategorizeTransactions` describe block, or create one if needed). The existing test file mocks `@kasa/db`. Add:

```typescript
it('should skip AI-sourced transactions', async () => {
  // The test setup already mocks prisma
  mockFindMany.mockResolvedValue([]); // loadRules returns empty (no match)
  const { bulkCategorizeTransactions } = await import(
    '../../../src/services/categorization.service.js'
  );
  const txs = [
    { id: 'tx-1', label: 'test', categorySource: 'AI' },
    { id: 'tx-2', label: 'test', categorySource: 'NONE' },
  ];
  // With empty rules, nothing matches — but AI should be skipped
  const count = await bulkCategorizeTransactions('user-1', txs);
  expect(count).toBe(0);
  // tx-1 (AI) should not have been processed at all
  expect(mockUpdate).not.toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

The test should currently pass because with no rules, nothing matches. But the important behavioral change is: when rules DO match, AI-sourced transactions should not be overwritten. Let's adjust the test to be meaningful:

Actually, the real change is on line 104: change `if (tx.categorySource === 'MANUAL') continue;` to also skip `AI`. Let's write a test that proves AI transactions are skipped even when rules match.

Add in the test file, within a describe block that has rules set up:

```typescript
it('should skip AI-sourced transactions even when rules match', async () => {
  const rules = [
    { id: 'r1', keyword: 'carrefour', categoryId: 'cat-1', isSystem: true, userId: null, createdAt: new Date() },
  ];
  mockFindMany.mockResolvedValue(rules);
  const { bulkCategorizeTransactions } = await import(
    '../../../src/services/categorization.service.js'
  );
  const txs = [
    { id: 'tx-ai', label: 'CB CARREFOUR', categorySource: 'AI' },
  ];
  const count = await bulkCategorizeTransactions('user-1', txs);
  expect(count).toBe(0);
  expect(mockUpdate).not.toHaveBeenCalled();
});
```

**Step 3: Run test — should FAIL** (currently AI is not skipped).

**Step 4: Update categorization.service.ts line 104**

Change:
```typescript
    if (tx.categorySource === 'MANUAL') continue;
```
to:
```typescript
    if (tx.categorySource === 'MANUAL' || tx.categorySource === 'AI') continue;
```

**Step 5: Run test to verify it passes**

Run:
```bash
cd /home/captus/Projects/kasa && pnpm --filter @kasa/backend run test -- --run backend/tests/unit/services/categorization.service.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/services/categorization.service.ts backend/tests/unit/services/categorization.service.test.ts
git commit -m "fix(categorization): skip AI-sourced transactions in bulk rule matching"
```

---

### Task 6: Integrate AI categorization into import flow

**Files:**
- Modify: `backend/src/services/import.service.ts:189-197`

**Step 1: Add the AI call after rule-based categorization**

In `backend/src/services/import.service.ts`, after the existing `bulkCategorizeTransactions` call (line ~197), add:

```typescript
import { aiCategorizeBatch } from './aiCategorization.service.js';
import { config } from '../config.js';
```

Then after line 197 (after `bulkCategorizeTransactions`), before `detectRecurringPatterns`, add:

```typescript
  // AI-categorize remaining NONE transactions (if enabled)
  if (config.AI_CATEGORIZATION_ENABLED) {
    const freshTransactions = await prisma.importedTransaction.findMany({
      where: { sessionId: session.session.id, categorySource: 'NONE' },
      select: { id: true, label: true, categorySource: true },
    });
    if (freshTransactions.length > 0) {
      await aiCategorizeBatch(userId, freshTransactions);
    }
  }
```

**Step 2: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors.

**Step 3: Run full test suite**

Run:
```bash
pnpm test
```

Expected: All pass (import tests mock the services, so no real AI calls).

**Step 4: Commit**

```bash
git add backend/src/services/import.service.ts
git commit -m "feat(import): trigger AI categorization on remaining NONE transactions"
```

---

### Task 7: Backend Routes — AI status + on-demand categorize

**Files:**
- Modify: `backend/src/routes/categories.router.ts`
- Test: `backend/tests/integration/categories.ai.test.ts` (optional — integration test)

**Step 1: Add routes to categories.router.ts**

Add the import at the top of `backend/src/routes/categories.router.ts`:

```typescript
import { aiCategorizeBatch } from '../services/aiCategorization.service.js';
import { config } from '../config.js';
```

Add before the `// ─── Rules` section (around line 102):

```typescript
// GET /api/categories/ai-status
router.get('/ai-status', async (ctx: Router.RouterContext) => {
  ctx.body = { enabled: config.AI_CATEGORIZATION_ENABLED };
});

// POST /api/categories/ai-categorize
router.post('/ai-categorize', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;

  if (!config.AI_CATEGORIZATION_ENABLED) {
    ctx.status = 503;
    ctx.body = { error: 'AI_DISABLED', message: 'AI categorization is not enabled' };
    return;
  }

  const uncategorized = await prisma.importedTransaction.findMany({
    where: { userId, categorySource: 'NONE' },
    select: { id: true, label: true, categorySource: true },
  });

  if (uncategorized.length === 0) {
    ctx.body = { categorized: 0, rulesCreated: 0 };
    return;
  }

  const result = await aiCategorizeBatch(userId, uncategorized);
  ctx.body = result;
});
```

Also add the prisma import at the top:
```typescript
import { prisma } from '@kasa/db';
```

**Step 2: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors.

**Step 3: Run full test suite**

Run:
```bash
pnpm test
```

Expected: All pass.

**Step 4: Commit**

```bash
git add backend/src/routes/categories.router.ts
git commit -m "feat(routes): add AI status and on-demand categorize endpoints"
```

---

### Task 8: Frontend — Update CategorySource type + RTK Query endpoints

**Files:**
- Modify: `frontend/src/services/transactionsApi.ts:6`

**Step 1: Update CategorySource type**

In `frontend/src/services/transactionsApi.ts` line 6, change:

```typescript
export type CategorySource = 'NONE' | 'AUTO' | 'MANUAL';
```

to:

```typescript
export type CategorySource = 'NONE' | 'AUTO' | 'AI' | 'MANUAL';
```

**Step 2: Add new endpoints**

In the `endpoints` builder (inside `transactionsApi`), add after `listRuleSuggestions`:

```typescript
    getAiStatus: builder.query<{ enabled: boolean }, void>({
      query: () => '/categories/ai-status',
    }),

    aiCategorize: builder.mutation<
      { categorized: number; rulesCreated: number; error?: string },
      void
    >({
      query: () => ({ url: '/categories/ai-categorize', method: 'POST' }),
      invalidatesTags: ['Transaction', 'CategoryRule'],
    }),
```

**Step 3: Export the new hooks**

Add to the export block:

```typescript
  useGetAiStatusQuery,
  useAiCategorizeMutation,
```

**Step 4: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors.

**Step 5: Commit**

```bash
git add frontend/src/services/transactionsApi.ts
git commit -m "feat(frontend): add AI status query and categorize mutation endpoints"
```

---

### Task 9: Frontend — i18n keys

**Files:**
- Modify: `frontend/src/i18n/fr.json`
- Modify: `frontend/src/i18n/en.json`

**Step 1: Add French keys**

Add to `frontend/src/i18n/fr.json`:

```json
"categories.ai.badge": "Catégorisé par IA",
"categories.ai.button": "Catégoriser avec l'IA",
"categories.ai.success": "{count, plural, one {# transaction catégorisée} other {# transactions catégorisées}} par l'IA",
"categories.ai.disabled": "Catégorisation IA non disponible",
"categories.ai.noTransactions": "Aucune transaction à catégoriser"
```

**Step 2: Add English keys**

Add to `frontend/src/i18n/en.json`:

```json
"categories.ai.badge": "Categorized by AI",
"categories.ai.button": "Categorize with AI",
"categories.ai.success": "{count, plural, one {# transaction categorized} other {# transactions categorized}} by AI",
"categories.ai.disabled": "AI categorization not available",
"categories.ai.noTransactions": "No transactions to categorize"
```

**Step 3: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/src/i18n/fr.json frontend/src/i18n/en.json
git commit -m "feat(i18n): add AI categorization translation keys"
```

---

### Task 10: Frontend — AI Badge on UnifiedTransactionList

**Files:**
- Modify: `frontend/src/components/UnifiedTransactionList.tsx:61-87`

**Step 1: Add the AI badge**

In `UnifiedTransactionList.tsx`, in the `TransactionItem` component, find the category display section (around line 61-67). After the category name span, add the AI badge:

Add import at top:
```typescript
import { Sparkles } from 'lucide-react';
```

Then in the category display area (line 61-67), modify the `<span>` that shows the category to include the AI badge:

```tsx
        <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
          <span
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ backgroundColor: tx.category?.color ?? '#94a3b8' }}
          />
          {tx.category?.name ?? intl.formatMessage({ id: 'transactions.category.none' })}
          {tx.categorySource === 'AI' && (
            <span
              title={intl.formatMessage({ id: 'categories.ai.badge' })}
              className="inline-flex items-center"
            >
              <Sparkles className="size-3.5 text-violet-500" />
            </span>
          )}
        </span>
```

**Step 2: Verify it compiles**

Run:
```bash
pnpm typecheck
```

Expected: No errors. Note: `lucide-react` should already be installed (used elsewhere). If not:

```bash
pnpm --filter frontend add lucide-react
```

**Step 3: Commit**

```bash
git add frontend/src/components/UnifiedTransactionList.tsx
git commit -m "feat(ui): add sparkle badge for AI-categorized transactions"
```

---

### Task 11: Frontend — AI Categorize Button on TransactionsPage

**Files:**
- Modify: `frontend/src/pages/TransactionsPage.tsx`

**Step 1: Add the AI button**

In `TransactionsPage.tsx`, add imports:

```typescript
import { Sparkles } from 'lucide-react';
import {
  useGetAiStatusQuery,
  useAiCategorizeMutation,
} from '../services/transactionsApi';
```

Add a new `AiCategorizeButton` component above `TransactionsPage`:

```tsx
function AiCategorizeButton({ hasUncategorized }: { hasUncategorized: boolean }) {
  const intl = useIntl();
  const { data: aiStatus } = useGetAiStatusQuery();
  const [aiCategorize, { isLoading }] = useAiCategorizeMutation();

  if (!aiStatus?.enabled) return null;

  async function handleClick() {
    const result = await aiCategorize().unwrap();
    if (result.categorized > 0) {
      // Success feedback handled by RTK Query cache invalidation (list refreshes)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || !hasUncategorized}
      className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
    >
      <Sparkles className="size-4" />
      {isLoading ? '…' : intl.formatMessage({ id: 'categories.ai.button' })}
    </button>
  );
}
```

In `TransactionsPage`, compute `hasUncategorized` from the loaded transactions and add the button next to the existing `AddButton`:

After `const allTransactions = [...]` (line ~119), add:

```typescript
  const hasUncategorized = allTransactions.some((tx) => tx.categorySource === 'NONE');
```

In the header JSX (line ~140-145), change the button area to include both buttons:

```tsx
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-kasa-dark dark:text-slate-100">
          {intl.formatMessage({ id: 'transactions.title' })}
        </h1>
        <div className="flex items-center gap-2">
          <AiCategorizeButton hasUncategorized={hasUncategorized} />
          <AddButton onClick={() => setShowForm(true)} />
        </div>
      </div>
```

**Step 2: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors.

**Step 3: Commit**

```bash
git add frontend/src/pages/TransactionsPage.tsx
git commit -m "feat(ui): add AI categorize button to transactions page"
```

---

### Task 12: Lint, Typecheck, Full Test Suite

**Step 1: Run Biome check**

Run:
```bash
pnpm check
```

Fix any issues found.

**Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors.

**Step 3: Run full test suite**

Run:
```bash
pnpm test
```

Expected: All tests pass, coverage thresholds met.

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: fix lint and formatting issues"
```

---

### Task 13: Update .env.example and documentation

**Files:**
- Modify: `.env.example` (if it exists) or document in README

**Step 1: Add AI env vars to .env.example**

If `.env.example` exists, add:

```bash
# AI Categorization (optional — feature disabled without keys)
# GEMINI_API_KEY=your-google-ai-studio-key
# GROQ_API_KEY=your-groq-api-key
# AI_CATEGORIZATION_ENABLED=true
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add AI categorization env vars to .env.example"
```
