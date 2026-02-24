import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  createMovement,
  createPocket,
  deleteMovement,
  deletePocket,
  getPocket,
  listPockets,
  updatePocket,
} from '../services/pockets.service.js';

const router = new Router({ prefix: '/api/pockets' });

router.use(requireAuth);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function userId(ctx: Router.RouterContext): string {
  return ctx.state.user.sub as string;
}

function parseGoalAmount(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return !Number.isNaN(n) && n > 0 ? n : null;
}

function parseColor(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return HEX_COLOR.test(s) ? s : null;
}

function applyNameField(
  body: Record<string, unknown>,
  input: Record<string, unknown>,
): string | null {
  if (body.name === undefined) return null;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return 'name cannot be empty';
  input.name = name;
  return null;
}

function applyGoalField(
  body: Record<string, unknown>,
  input: Record<string, unknown>,
): string | null {
  if (body.goalAmount === undefined) return null;
  const g = parseGoalAmount(body.goalAmount);
  if (g === null) return 'goalAmount must be greater than 0';
  input.goalAmount = g;
  return null;
}

function applyColorField(
  body: Record<string, unknown>,
  input: Record<string, unknown>,
): string | null {
  if (body.color === undefined) return null;
  const c = parseColor(body.color);
  if (c === null) return 'color must be a valid hex color (#rrggbb)';
  input.color = c;
  return null;
}

function parsePatchInput(body: Record<string, unknown>): {
  input: Record<string, unknown>;
  error: string | null;
} {
  const input: Record<string, unknown> = {};
  const error =
    applyNameField(body, input) ?? applyGoalField(body, input) ?? applyColorField(body, input);
  return { input, error };
}

// ─── GET /api/pockets ─────────────────────────────────────────────────────────

router.get('/', async (ctx: Router.RouterContext) => {
  const pockets = await listPockets(userId(ctx));
  ctx.body = { pockets };
});

// ─── POST /api/pockets ────────────────────────────────────────────────────────

function parseCreatePocketBody(
  body: Record<string, unknown>,
):
  | { accountId: string; name: string; goalAmount: number; color: string }
  | { validationError: string } {
  const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : '';
  if (!accountId) return { validationError: 'accountId is required' };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { validationError: 'name is required' };

  const goalAmount =
    typeof body.goalAmount === 'number' ? body.goalAmount : Number(body.goalAmount);
  if (!goalAmount || Number.isNaN(goalAmount) || goalAmount <= 0) {
    return { validationError: 'goalAmount must be greater than 0' };
  }

  const color = typeof body.color === 'string' ? body.color.trim() : '';
  if (!color || !HEX_COLOR.test(color)) {
    return { validationError: 'color must be a valid hex color (#rrggbb)' };
  }

  return { accountId, name, goalAmount, color };
}

router.post('/', async (ctx: Router.RouterContext) => {
  const body = ctx.request.body as Record<string, unknown>;
  const parsed = parseCreatePocketBody(body);
  if ('validationError' in parsed) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: parsed.validationError };
    return;
  }

  try {
    const pocket = await createPocket(userId(ctx), parsed);
    ctx.status = 201;
    ctx.body = pocket;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'ACCOUNT_NOT_FOUND') {
      ctx.status = 404;
      ctx.body = { error: 'ACCOUNT_NOT_FOUND', message: 'Account not found or not accessible' };
      return;
    }
    throw err;
  }
});

// ─── GET /api/pockets/:id ─────────────────────────────────────────────────────

router.get('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const limit = Math.min(Number(ctx.query.limit ?? 20), 100);
  const cursor = typeof ctx.query.cursor === 'string' ? ctx.query.cursor : undefined;

  const pocket = await getPocket(userId(ctx), id, limit, cursor);
  if (!pocket) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = pocket;
});

// ─── PATCH /api/pockets/:id ───────────────────────────────────────────────────

router.patch('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as Record<string, unknown>;
  const { input, error } = parsePatchInput(body);
  if (error) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: error };
    return;
  }
  const pocket = await updatePocket(userId(ctx), id, input);
  if (!pocket) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = pocket;
});

// ─── DELETE /api/pockets/:id ──────────────────────────────────────────────────

router.delete('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const deleted = await deletePocket(userId(ctx), id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.status = 204;
});

function parseMovementBody(body: Record<string, unknown>):
  | {
      direction: 'ALLOCATION' | 'WITHDRAWAL';
      amount: number;
      date: string;
      note: string | undefined;
    }
  | { validationError: string } {
  const direction = body.direction;
  if (direction !== 'ALLOCATION' && direction !== 'WITHDRAWAL') {
    return { validationError: 'direction must be ALLOCATION or WITHDRAWAL' };
  }
  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return { validationError: 'amount must be greater than 0' };
  }
  const date = typeof body.date === 'string' ? body.date : '';
  if (!date || Number.isNaN(Date.parse(date))) {
    return { validationError: 'date must be a valid ISO date string' };
  }
  const note = typeof body.note === 'string' ? body.note.trim() || undefined : undefined;
  return { direction, amount, date, note };
}

function handleMovementError(ctx: Router.RouterContext, err: unknown): void {
  const error = err as Error & { headroom?: number; available?: number };
  if (error.message === 'NOT_FOUND') {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
  } else if (error.message === 'INSUFFICIENT_HEADROOM') {
    ctx.status = 422;
    ctx.body = { error: 'INSUFFICIENT_HEADROOM', headroom: error.headroom ?? 0 };
  } else if (error.message === 'INSUFFICIENT_POCKET_FUNDS') {
    ctx.status = 422;
    ctx.body = { error: 'INSUFFICIENT_POCKET_FUNDS', available: error.available ?? 0 };
  } else {
    throw err;
  }
}

// ─── POST /api/pockets/:id/movements ─────────────────────────────────────────

router.post('/:id/movements', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as Record<string, unknown>;
  const parsed = parseMovementBody(body);
  if ('validationError' in parsed) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: parsed.validationError };
    return;
  }
  try {
    const pocket = await createMovement(userId(ctx), id, parsed);
    ctx.status = 201;
    ctx.body = pocket;
  } catch (err: unknown) {
    handleMovementError(ctx, err);
  }
});

// ─── DELETE /api/pockets/:id/movements/:movementId ────────────────────────────

router.delete('/:id/movements/:movementId', async (ctx: Router.RouterContext) => {
  const { id, movementId } = ctx.params as { id: string; movementId: string };
  const pocket = await deleteMovement(userId(ctx), id, movementId);
  if (!pocket) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = pocket;
});

export default router;
