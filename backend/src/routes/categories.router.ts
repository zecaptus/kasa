import { prisma } from '@kasa/db';
import Router from '@koa/router';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { aiCategorizeBatch } from '../services/aiCategorization.service.js';
import {
  createCategory,
  createCategoryRule,
  deleteCategory,
  deleteCategoryRule,
  listCategories,
  listCategoryRules,
  updateCategory,
  updateCategoryRule,
} from '../services/categories.service.js';
import {
  invalidateRuleCache,
  recategorizeAll,
  recategorizeUncategorized,
} from '../services/categorization.service.js';
import { suggestRules } from '../services/ruleSuggestions.service.js';

const router = new Router({ prefix: '/api/categories' });

router.use(requireAuth);

// GET /api/categories
router.get('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const categories = await listCategories(userId);
  ctx.body = { categories };
});

// POST /api/categories
router.post('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const body = ctx.request.body as { name?: unknown; color?: unknown };
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const color = typeof body?.color === 'string' ? body.color.trim() : '';

  if (!name) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'name is required' };
    return;
  }
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'color must be a valid hex color (#rrggbb)' };
    return;
  }

  try {
    const category = await createCategory(userId, name, color);
    ctx.status = 201;
    ctx.body = category;
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      ctx.status = 409;
      ctx.body = { error: 'CONFLICT', message: 'A category with this name already exists' };
      return;
    }
    throw err;
  }
});

// PATCH /api/categories/:id
router.patch('/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { name?: unknown; color?: unknown };

  const updates: { name?: string; color?: string } = {};
  if (typeof body?.name === 'string') updates.name = body.name.trim();
  if (typeof body?.color === 'string') updates.color = body.color.trim();

  const category = await updateCategory(userId, id, updates);
  if (!category) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  ctx.body = category;
});

// DELETE /api/categories/:id
router.delete('/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };

  const result = await deleteCategory(userId, id);
  if (!result) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  ctx.body = result;
});

// ─── AI ──────────────────────────────────────────────────────────────────────

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
    select: { id: true, label: true, detail: true, categorySource: true },
  });

  if (uncategorized.length === 0) {
    ctx.body = { categorized: 0, rulesCreated: 0 };
    return;
  }

  const result = await aiCategorizeBatch(userId, uncategorized);
  ctx.body = result;
});

// ─── Rules ────────────────────────────────────────────────────────────────────

// GET /api/categories/suggestions
router.get('/suggestions', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  ctx.body = { suggestions: await suggestRules(userId) };
});

// POST /api/categories/recategorize-all
router.post('/recategorize-all', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  invalidateRuleCache(userId);
  const categorized = await recategorizeAll(userId);
  ctx.body = { categorized };
});

// GET /api/categories/rules
router.get('/rules', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const rules = await listCategoryRules(userId);
  ctx.body = { rules };
});

// POST /api/categories/rules
router.post('/rules', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const body = ctx.request.body as { keyword?: unknown; categoryId?: unknown };
  const keyword = typeof body?.keyword === 'string' ? body.keyword.trim() : '';
  const categoryId = typeof body?.categoryId === 'string' ? body.categoryId : '';

  if (!keyword) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'keyword is required' };
    return;
  }
  if (keyword.length > 100) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'keyword must be 100 characters or fewer' };
    return;
  }
  if (!categoryId) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'categoryId is required' };
    return;
  }

  const rule = await createCategoryRule(userId, keyword, categoryId);
  invalidateRuleCache(userId);
  const categorized = await recategorizeUncategorized(userId);
  ctx.status = 201;
  ctx.body = { ...rule, categorized };
});

// PATCH /api/categories/rules/:id
router.patch('/rules/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { keyword?: unknown; categoryId?: unknown };

  const updates: { keyword?: string; categoryId?: string } = {};
  if (typeof body?.keyword === 'string') updates.keyword = body.keyword.trim();
  if (typeof body?.categoryId === 'string') updates.categoryId = body.categoryId;

  const rule = await updateCategoryRule(userId, id, updates);
  if (!rule) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  invalidateRuleCache(userId);
  const categorized = await recategorizeUncategorized(userId);
  ctx.body = { ...rule, categorized };
});

// DELETE /api/categories/rules/:id
router.delete('/rules/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };

  const deleted = await deleteCategoryRule(userId, id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  ctx.status = 204;
});

export default router;
