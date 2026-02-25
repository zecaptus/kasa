import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  decodeCursor,
  getTransactionById,
  listTimeline,
  listTransferCandidates,
  updateTransactionCategory,
  updateTransactionRecurring,
  updateTransferPeer,
} from '../services/timeline.service.js';
import { setTransferLabel } from '../services/transferLabels.service.js';

const router = new Router({ prefix: '/api/transactions' });

router.use(requireAuth);

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function parseListParams(q: Router.RouterContext['query']) {
  const d = q.direction;
  const direction: 'debit' | 'credit' | undefined = d === 'debit' || d === 'credit' ? d : undefined;
  return {
    limit: Math.min(Number(q.limit ?? 50), 200),
    rawCursor: str(q.cursor),
    from: str(q.from),
    to: str(q.to),
    categoryId: str(q.categoryId),
    direction,
    search: str(q.search)?.trim() || undefined,
    accountId: str(q.accountId),
    transferLabel: str(q.transferLabel),
  };
}

// GET /api/transactions
router.get('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { limit, rawCursor, from, to, categoryId, direction, search, accountId, transferLabel } =
    parseListParams(ctx.query);

  const cursor = rawCursor ? decodeCursor(rawCursor) : undefined;

  const result = await listTimeline(userId, {
    limit,
    cursor,
    from,
    to,
    categoryId,
    direction,
    search,
    accountId,
    transferLabel,
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

// PATCH /api/transactions/:id/recurring
router.patch('/:id/recurring', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { recurringPatternId?: unknown };
  const recurringPatternId =
    body?.recurringPatternId === null
      ? null
      : typeof body?.recurringPatternId === 'string'
        ? body.recurringPatternId
        : undefined;

  if (recurringPatternId === undefined) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'recurringPatternId must be a string or null',
    };
    return;
  }

  const updated = await updateTransactionRecurring(userId, id, recurringPatternId);
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

// GET /api/transactions/:id/transfer-candidates?accountId=xxx
router.get('/:id/transfer-candidates', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const accountId = typeof ctx.query.accountId === 'string' ? ctx.query.accountId : undefined;
  if (!accountId) {
    ctx.body = { candidates: [] };
    return;
  }
  const candidates = await listTransferCandidates(userId, id, accountId);
  ctx.body = { candidates };
});

// PATCH /api/transactions/:id/transfer-peer
router.patch('/:id/transfer-peer', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { transferPeerId?: unknown };
  const transferPeerId =
    body?.transferPeerId === null
      ? null
      : typeof body?.transferPeerId === 'string'
        ? body.transferPeerId
        : undefined;

  if (transferPeerId === undefined) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'transferPeerId must be a string or null' };
    return;
  }

  const updated = await updateTransferPeer(userId, id, transferPeerId);
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

// PATCH /api/transactions/:id/transfer-label
router.patch('/:id/transfer-label', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { label?: unknown };
  const label =
    body?.label === null ? null : typeof body?.label === 'string' ? body.label : undefined;

  if (label === undefined) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'label must be a string or null' };
    return;
  }

  const found = await setTransferLabel(userId, id, label);
  if (!found) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  const updated = await getTransactionById(userId, id);
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
