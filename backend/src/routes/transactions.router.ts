import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  decodeCursor,
  getTransactionById,
  listTimeline,
  updateTransactionCategory,
} from '../services/timeline.service.js';

const router = new Router({ prefix: '/api/transactions' });

router.use(requireAuth);

// GET /api/transactions
router.get('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const limit = Math.min(Number(ctx.query.limit ?? 50), 200);
  const rawCursor = typeof ctx.query.cursor === 'string' ? ctx.query.cursor : undefined;
  const from = typeof ctx.query.from === 'string' ? ctx.query.from : undefined;
  const to = typeof ctx.query.to === 'string' ? ctx.query.to : undefined;
  const categoryId = typeof ctx.query.categoryId === 'string' ? ctx.query.categoryId : undefined;
  const directionRaw = ctx.query.direction;
  const direction =
    directionRaw === 'debit' || directionRaw === 'credit' ? directionRaw : undefined;
  const search = typeof ctx.query.search === 'string' ? ctx.query.search.trim() : undefined;

  let cursor: ReturnType<typeof decodeCursor> | undefined;
  if (rawCursor) {
    cursor = decodeCursor(rawCursor);
  }

  const result = await listTimeline(userId, {
    limit,
    cursor,
    from,
    to,
    categoryId,
    direction,
    search: search || undefined,
  });

  ctx.body = {
    transactions: result.items.map((item) => ({
      ...item,
      date: item.date.toISOString().split('T')[0],
      amount: Number(item.amount),
      totals: undefined,
    })),
    nextCursor: result.nextCursor,
    totals: {
      debit: Number(result.totals.debit),
      credit: Number(result.totals.credit),
    },
  };
});

// GET /api/transactions/:id
router.get('/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };

  const transaction = await getTransactionById(userId, id);
  if (!transaction) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  ctx.body = {
    ...transaction,
    date: transaction.date.toISOString().split('T')[0],
    amount: Number(transaction.amount),
  };
});

// PATCH /api/transactions/:id/category
router.patch('/:id/category', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { categoryId?: unknown };
  const categoryId =
    body?.categoryId === null
      ? null
      : typeof body?.categoryId === 'string'
        ? body.categoryId
        : undefined;

  if (categoryId === undefined) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'categoryId must be a string or null' };
    return;
  }

  const updated = await updateTransactionCategory(userId, id, categoryId);
  if (!updated) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  ctx.body = {
    ...updated,
    date: updated.date.toISOString().split('T')[0],
    amount: Number(updated.amount),
  };
});

export default router;
