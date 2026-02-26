import { type Category, type ImportedTransaction, prisma } from '@kasa/db';
import { z } from 'zod';
import { config } from '../config.js';
import { createFallbackProvider } from './aiProvider.js';
import { invalidateRuleCache } from './categorization.service.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 30;
const AUTO_LEARN_CONFIDENCE = 0.9;
const AUTO_LEARN_MIN_KEYWORD_LENGTH = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AiCategorizeBatchResult {
  categorized: number;
  rulesCreated: number;
  error?: string;
}

interface ParsedAiResult {
  index: number;
  categoryId: string;
  confidence: number;
  keyword: string;
}

type TransactionInput = Pick<ImportedTransaction, 'id' | 'label' | 'detail' | 'categorySource'>;

// ─── Zod schema for AI response validation ───────────────────────────────────

const aiResultItemSchema = z.object({
  index: z.number().int().nonnegative(),
  categoryId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  keyword: z.string(),
});

const aiResponseSchema = z.object({
  results: z.array(aiResultItemSchema),
});

// ─── buildPrompt ─────────────────────────────────────────────────────────────

export function buildPrompt(
  categories: Array<Pick<Category, 'id' | 'name'>>,
  transactions: Array<Pick<ImportedTransaction, 'label' | 'detail'>>,
): string {
  const categoryLines = categories.map((c) => `- "${c.id}" → ${c.name}`).join('\n');

  const transactionLines = transactions
    .map((t, i) => {
      const detail = t.detail ? ` | détail: "${t.detail}"` : '';
      return `${i}: "${t.label}"${detail}`;
    })
    .join('\n');

  return `Tu es un assistant de catégorisation de transactions bancaires françaises.
Catégories disponibles (id → nom) :
${categoryLines}

Pour chaque transaction, retourne UNIQUEMENT un JSON valide :
{ "results": [{ "index": 0, "categoryId": "id_categorie", "confidence": 0.95, "keyword": "motcle" }] }

Règles :
- confidence entre 0.0 et 1.0
- keyword : le mot-clé principal qui justifie la catégorisation (minuscule, sans accents)
- Si incertain (confidence < 0.5), utilise categoryId: null

Transactions :
${transactionLines}`;
}

// ─── parseAiResponse ─────────────────────────────────────────────────────────

export function parseAiResponse(raw: string): Array<ParsedAiResult> {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    const validated = aiResponseSchema.parse(parsed);

    return validated.results
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

// ─── Auto-learning helper ────────────────────────────────────────────────────

function shouldAutoLearn(result: ParsedAiResult): boolean {
  return (
    result.confidence >= AUTO_LEARN_CONFIDENCE &&
    result.keyword.length >= AUTO_LEARN_MIN_KEYWORD_LENGTH
  );
}

async function tryCreateRule(userId: string, result: ParsedAiResult): Promise<boolean> {
  const existingRule = await prisma.categoryRule.findFirst({
    where: {
      keyword: { equals: result.keyword, mode: 'insensitive' },
      OR: [{ userId }, { isSystem: true }],
    },
  });

  if (existingRule) return false;

  await prisma.categoryRule.create({
    data: {
      userId,
      keyword: result.keyword,
      categoryId: result.categoryId,
      isSystem: false,
    },
  });
  return true;
}

// ─── Apply single AI result to a transaction ─────────────────────────────────

async function applyResult(
  userId: string,
  batch: TransactionInput[],
  result: ParsedAiResult,
  categoryMap: Map<string, Category>,
): Promise<{ categorized: boolean; ruleCreated: boolean }> {
  const tx = batch[result.index];
  if (!tx || !categoryMap.has(result.categoryId)) {
    return { categorized: false, ruleCreated: false };
  }

  await prisma.importedTransaction.update({
    where: { id: tx.id },
    data: { categoryId: result.categoryId, categorySource: 'AI' },
  });

  let ruleCreated = false;
  if (shouldAutoLearn(result)) {
    ruleCreated = await tryCreateRule(userId, result);
  }

  return { categorized: true, ruleCreated };
}

// ─── Process a single batch ──────────────────────────────────────────────────

interface BatchCounters {
  categorized: number;
  rulesCreated: number;
}

async function processBatch(
  userId: string,
  batch: TransactionInput[],
  categories: Category[],
  categoryMap: Map<string, Category>,
  provider: { generate: (prompt: string) => Promise<string> },
): Promise<BatchCounters> {
  const prompt = buildPrompt(categories, batch);

  console.log(
    `[aiCategorization] Sending ${batch.length} transactions:`,
    batch.map((t, i) => `  ${i}: "${t.label}"${t.detail ? ` | "${t.detail}"` : ''}`).join('\n'),
  );

  const raw = await provider.generate(prompt);
  console.log('[aiCategorization] AI raw response:', raw);

  const results = parseAiResponse(raw);
  console.log(`[aiCategorization] Parsed ${results.length}/${batch.length} valid results`);

  let categorized = 0;
  let rulesCreated = 0;

  for (const result of results) {
    const tx = batch[result.index];
    const cat = categoryMap.get(result.categoryId);
    const outcome = await applyResult(userId, batch, result, categoryMap);
    if (outcome.categorized) {
      console.log(
        `[aiCategorization] ✓ "${tx?.label}" → ${cat?.name} (${(result.confidence * 100).toFixed(0)}%, keyword: "${result.keyword}")${outcome.ruleCreated ? ' [rule created]' : ''}`,
      );
      categorized++;
    }
    if (outcome.ruleCreated) rulesCreated++;
  }

  return { categorized, rulesCreated };
}

// ─── aiCategorizeBatch ───────────────────────────────────────────────────────

export async function aiCategorizeBatch(
  userId: string,
  transactions: TransactionInput[],
): Promise<AiCategorizeBatchResult> {
  const uncategorized = transactions.filter((tx) => tx.categorySource === 'NONE');

  console.log(
    `[aiCategorization] Starting: ${uncategorized.length}/${transactions.length} transactions need AI categorization`,
  );

  if (uncategorized.length === 0) {
    return { categorized: 0, rulesCreated: 0 };
  }

  const categories = await prisma.category.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const provider = createFallbackProvider(config.GEMINI_API_KEY, config.GROQ_API_KEY);

  let totalCategorized = 0;
  let totalRulesCreated = 0;

  for (let i = 0; i < uncategorized.length; i += BATCH_SIZE) {
    const batch = uncategorized.slice(i, i + BATCH_SIZE);

    try {
      const counters = await processBatch(userId, batch, categories, categoryMap, provider);
      totalCategorized += counters.categorized;
      totalRulesCreated += counters.rulesCreated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI provider error';
      console.error(`[aiCategorization] Provider error: ${message}`);
      return { categorized: totalCategorized, rulesCreated: totalRulesCreated, error: message };
    }
  }

  if (totalRulesCreated > 0) {
    invalidateRuleCache(userId);
  }

  console.log(
    `[aiCategorization] Done: ${totalCategorized} categorized, ${totalRulesCreated} rules created`,
  );

  return { categorized: totalCategorized, rulesCreated: totalRulesCreated };
}
