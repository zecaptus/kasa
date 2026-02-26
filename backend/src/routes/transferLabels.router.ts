import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  applyTransferLabelRules,
  createTransferLabelRule,
  deleteTransferLabelRule,
  listTransferLabelRules,
  updateTransferLabelRule,
} from '../services/transferLabels.service.js';

function validateKeyword(v: unknown): string | null {
  if (typeof v !== 'string' || v.trim() === '' || v.length > 100) {
    return 'keyword must be a non-empty string (≤100 chars)';
  }
  return null;
}

function validateLabel(v: unknown): string | null {
  if (typeof v !== 'string' || v.trim() === '' || v.length > 100) {
    return 'label must be a non-empty string (≤100 chars)';
  }
  return null;
}

function validateOptionalAmount(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number' || v <= 0) return 'amount must be a positive number';
  return null;
}

function processAmountField(raw: unknown): { error: string } | { value: number | null } {
  if (raw === null) return { value: null };
  if (typeof raw === 'number' && raw > 0) return { value: raw };
  return { error: 'amount must be a positive number' };
}

function buildTransferLabelData(body: { keyword?: unknown; label?: unknown; amount?: unknown }): {
  error?: string;
  data: { keyword?: string; label?: string; amount?: number | null };
} {
  const data: { keyword?: string; label?: string; amount?: number | null } = {};

  if (body?.keyword !== undefined) {
    const err = validateKeyword(body.keyword);
    if (err) return { error: err, data };
    data.keyword = (body.keyword as string).trim();
  }

  if (body?.label !== undefined) {
    const err = validateLabel(body.label);
    if (err) return { error: err, data };
    data.label = (body.label as string).trim();
  }

  if (body?.amount !== undefined) {
    const result = processAmountField(body.amount);
    if ('error' in result) return { error: result.error, data };
    data.amount = result.value;
  }

  return { data };
}

const router = new Router({ prefix: '/api/transfer-label-rules' });

router.use(requireAuth);

// GET /api/transfer-label-rules
router.get('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const rules = await listTransferLabelRules(userId);
  ctx.body = { rules };
});

// POST /api/transfer-label-rules
router.post('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const body = ctx.request.body as { keyword?: unknown; label?: unknown; amount?: unknown };

  const kwErr = validateKeyword(body?.keyword);
  if (kwErr) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: kwErr };
    return;
  }
  const lblErr = validateLabel(body?.label);
  if (lblErr) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: lblErr };
    return;
  }
  const amtErr = validateOptionalAmount(body?.amount);
  if (amtErr) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: amtErr };
    return;
  }

  const amount = body?.amount != null ? (body.amount as number) : null;
  const rule = await createTransferLabelRule(
    userId,
    (body.keyword as string).trim(),
    (body.label as string).trim(),
    amount,
  );
  const labeled = await applyTransferLabelRules(userId);
  ctx.status = 201;
  ctx.body = { ...rule, labeled };
});

// PATCH /api/transfer-label-rules/:id
router.patch('/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { keyword?: unknown; label?: unknown; amount?: unknown };

  const { error, data } = buildTransferLabelData(body);
  if (error) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: error };
    return;
  }

  const rule = await updateTransferLabelRule(userId, id, data);
  if (!rule) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  const labeled = await applyTransferLabelRules(userId);
  ctx.body = { ...rule, labeled };
});

// DELETE /api/transfer-label-rules/:id
router.delete('/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };

  const deleted = await deleteTransferLabelRule(userId, id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }

  ctx.status = 204;
});

export default router;
