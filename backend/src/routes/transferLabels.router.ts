import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  applyTransferLabelRules,
  createTransferLabelRule,
  deleteTransferLabelRule,
  listTransferLabelRules,
  updateTransferLabelRule,
} from '../services/transferLabels.service.js';

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
  const body = ctx.request.body as { keyword?: unknown; label?: unknown };

  if (
    typeof body?.keyword !== 'string' ||
    body.keyword.trim() === '' ||
    body.keyword.length > 100
  ) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'keyword must be a non-empty string (≤100 chars)',
    };
    return;
  }
  if (typeof body?.label !== 'string' || body.label.trim() === '' || body.label.length > 100) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'label must be a non-empty string (≤100 chars)',
    };
    return;
  }

  const rule = await createTransferLabelRule(userId, body.keyword.trim(), body.label.trim());
  const labeled = await applyTransferLabelRules(userId);
  ctx.status = 201;
  ctx.body = { ...rule, labeled };
});

// PATCH /api/transfer-label-rules/:id
router.patch('/:id', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as { keyword?: unknown; label?: unknown };

  const data: { keyword?: string; label?: string } = {};

  if (body?.keyword !== undefined) {
    if (
      typeof body.keyword !== 'string' ||
      body.keyword.trim() === '' ||
      body.keyword.length > 100
    ) {
      ctx.status = 400;
      ctx.body = {
        error: 'VALIDATION_ERROR',
        message: 'keyword must be a non-empty string (≤100 chars)',
      };
      return;
    }
    data.keyword = body.keyword.trim();
  }

  if (body?.label !== undefined) {
    if (typeof body.label !== 'string' || body.label.trim() === '' || body.label.length > 100) {
      ctx.status = 400;
      ctx.body = {
        error: 'VALIDATION_ERROR',
        message: 'label must be a non-empty string (≤100 chars)',
      };
      return;
    }
    data.label = body.label.trim();
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
