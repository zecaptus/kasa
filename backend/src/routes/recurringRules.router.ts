import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  confirmPendingMatch,
  createRecurringRule,
  createRuleFromTransaction,
  deleteRecurringRule,
  dismissPendingMatch,
  isValidPeriod,
  listPendingMatches,
  listRecurringRules,
  type UpdateRecurringRuleInput,
  updateRecurringRule,
} from '../services/recurringRules.service.js';

const router = new Router({ prefix: '/api/recurring-rules' });

router.use(requireAuth);

function uid(ctx: Router.RouterContext): string {
  return ctx.state.user.sub as string;
}

// ─── GET /api/recurring-rules ────────────────────────────────────────────────

router.get('/', async (ctx: Router.RouterContext) => {
  const rules = await listRecurringRules(uid(ctx));
  ctx.body = { rules };
});

// ─── POST /api/recurring-rules ───────────────────────────────────────────────

router.post('/', async (ctx: Router.RouterContext) => {
  const body = ctx.request.body as Record<string, unknown>;

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'label is required' };
    return;
  }

  if (!isValidPeriod(body.periodMonths)) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'periodMonths must be 1, 2, 3, 6, or 12' };
    return;
  }

  const amount =
    body.amount != null
      ? typeof body.amount === 'number'
        ? body.amount
        : Number(body.amount)
      : null;

  const anchorDate = typeof body.anchorDate === 'string' ? body.anchorDate : undefined;

  const rule = await createRecurringRule(uid(ctx), {
    label,
    periodMonths: body.periodMonths,
    amount,
    ...(anchorDate !== undefined ? { anchorDate } : {}),
  });
  ctx.status = 201;
  ctx.body = rule;
});

// ─── POST /api/recurring-rules/from-transaction ──────────────────────────────

router.post('/from-transaction', async (ctx: Router.RouterContext) => {
  const body = ctx.request.body as Record<string, unknown>;

  const transactionId = typeof body.transactionId === 'string' ? body.transactionId : '';
  if (!transactionId) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'transactionId is required' };
    return;
  }

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'label is required' };
    return;
  }

  if (!isValidPeriod(body.periodMonths)) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'periodMonths must be 1, 2, 3, 6, or 12' };
    return;
  }

  const rule = await createRuleFromTransaction(uid(ctx), transactionId, {
    label,
    periodMonths: body.periodMonths,
  });

  if (!rule) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  ctx.status = 201;
  ctx.body = rule;
});

// ─── PATCH /api/recurring-rules/:id ─────────────────────────────────────────

function applyPatchLabel(
  body: Record<string, unknown>,
  input: UpdateRecurringRuleInput,
): string | null {
  if (body.label === undefined) return null;
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) return 'label cannot be empty';
  input.label = label;
  return null;
}

function applyPatchIsActive(
  body: Record<string, unknown>,
  input: UpdateRecurringRuleInput,
): string | null {
  if (body.isActive === undefined) return null;
  if (typeof body.isActive !== 'boolean') return 'isActive must be a boolean';
  input.isActive = body.isActive;
  return null;
}

function applyPatchPeriod(
  body: Record<string, unknown>,
  input: UpdateRecurringRuleInput,
): string | null {
  if (body.periodMonths === undefined) return null;
  if (!isValidPeriod(body.periodMonths)) return 'periodMonths must be 1, 2, 3, 6, or 12';
  input.periodMonths = body.periodMonths;
  return null;
}

function applyPatchAmount(body: Record<string, unknown>, input: UpdateRecurringRuleInput): void {
  if (body.amount === undefined) return;
  input.amount =
    body.amount === null
      ? null
      : typeof body.amount === 'number'
        ? body.amount
        : Number(body.amount);
}

function parsePatch(
  body: Record<string, unknown>,
): UpdateRecurringRuleInput | { validationError: string } {
  const input: UpdateRecurringRuleInput = {};
  const error =
    applyPatchLabel(body, input) ??
    applyPatchIsActive(body, input) ??
    applyPatchPeriod(body, input);
  if (error) return { validationError: error };
  applyPatchAmount(body, input);
  return input;
}

router.patch('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as Record<string, unknown>;
  const parsed = parsePatch(body);

  if ('validationError' in parsed) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: parsed.validationError };
    return;
  }

  const rule = await updateRecurringRule(uid(ctx), id, parsed);
  if (!rule) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = rule;
});

// ─── DELETE /api/recurring-rules/:id ────────────────────────────────────────

router.delete('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const deleted = await deleteRecurringRule(uid(ctx), id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.status = 204;
});

// ─── GET /api/recurring-rules/pending ───────────────────────────────────────

router.get('/pending', async (ctx: Router.RouterContext) => {
  const matches = await listPendingMatches(uid(ctx));
  ctx.body = { matches };
});

// ─── POST /api/recurring-rules/pending/:matchId/confirm ──────────────────────

router.post('/pending/:matchId/confirm', async (ctx: Router.RouterContext) => {
  const { matchId } = ctx.params as { matchId: string };
  const confirmed = await confirmPendingMatch(uid(ctx), matchId);
  if (!confirmed) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.status = 204;
});

// ─── DELETE /api/recurring-rules/pending/:matchId ────────────────────────────

router.delete('/pending/:matchId', async (ctx: Router.RouterContext) => {
  const { matchId } = ctx.params as { matchId: string };
  const dismissed = await dismissPendingMatch(uid(ctx), matchId);
  if (!dismissed) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.status = 204;
});

export default router;
