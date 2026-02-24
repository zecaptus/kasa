import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  getBankAccount,
  listBankAccounts,
  renameBankAccount,
  setAccountBalance,
  setAccountHidden,
} from '../services/bankAccounts.service.js';

const router = new Router({ prefix: '/api/bank-accounts' });

router.use(requireAuth);

function userId(ctx: Router.RouterContext): string {
  return ctx.state.user.sub as string;
}

// ─── GET /api/bank-accounts ───────────────────────────────────────────────────

router.get('/', async (ctx: Router.RouterContext) => {
  const accounts = await listBankAccounts(userId(ctx));
  ctx.body = { accounts };
});

// ─── GET /api/bank-accounts/:id ───────────────────────────────────────────────

router.get('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const account = await getBankAccount(userId(ctx), id);
  if (!account) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = account;
});

// ─── PATCH /api/bank-accounts/:id ────────────────────────────────────────────

router.patch('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as Record<string, unknown>;
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'label cannot be empty' };
    return;
  }
  const account = await renameBankAccount(userId(ctx), id, label);
  if (!account) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = account;
});

// ─── PATCH /api/bank-accounts/:id/hidden ─────────────────────────────────────

router.patch('/:id/hidden', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as Record<string, unknown>;
  if (typeof body.isHidden !== 'boolean') {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'isHidden (boolean) is required' };
    return;
  }
  const account = await setAccountHidden(userId(ctx), id, body.isHidden);
  if (!account) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = account;
});

// ─── PATCH /api/bank-accounts/:id/balance ────────────────────────────────────

router.patch('/:id/balance', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as Record<string, unknown>;
  const balance =
    typeof body.balance === 'number' ? body.balance : Number.parseFloat(String(body.balance ?? ''));
  const dateStr = typeof body.date === 'string' ? body.date : '';

  if (Number.isNaN(balance) || !dateStr) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'balance (number) and date (YYYY-MM-DD) are required',
    };
    return;
  }

  const account = await setAccountBalance(userId(ctx), id, balance, new Date(dateStr));
  if (!account) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = account;
});

export default router;
