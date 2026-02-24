import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import {
  createRecurringPattern,
  deleteRecurringPattern,
  listRecurringPatterns,
  type RecurrenceFrequency,
  type UpdateRecurringPatternInput,
  updateRecurringPattern,
} from '../services/recurringPatterns.service.js';

const router = new Router({ prefix: '/api/recurring-patterns' });

router.use(requireAuth);

function userId(ctx: Router.RouterContext): string {
  return ctx.state.user.sub as string;
}

// ─── GET /api/recurring-patterns ─────────────────────────────────────────────

router.get('/', async (ctx: Router.RouterContext) => {
  const patterns = await listRecurringPatterns(userId(ctx));
  ctx.body = { patterns };
});

// ─── POST /api/recurring-patterns ────────────────────────────────────────────

function parseFrequency(raw: unknown): RecurrenceFrequency | null {
  if (raw === 'WEEKLY' || raw === 'MONTHLY' || raw === 'ANNUAL') return raw;
  return null;
}

router.post('/', async (ctx: Router.RouterContext) => {
  const body = ctx.request.body as Record<string, unknown>;

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'label is required' };
    return;
  }

  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  if (!keyword) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'keyword is required' };
    return;
  }

  const frequency = parseFrequency(body.frequency);
  if (!frequency) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'frequency must be WEEKLY, MONTHLY, or ANNUAL',
    };
    return;
  }

  const amount =
    body.amount != null
      ? typeof body.amount === 'number'
        ? body.amount
        : Number(body.amount)
      : null;

  const pattern = await createRecurringPattern(userId(ctx), {
    label,
    keyword,
    frequency,
    amount,
  });
  ctx.status = 201;
  ctx.body = pattern;
});

// ─── PATCH /api/recurring-patterns/:id ───────────────────────────────────────

function applyPatchLabel(
  body: Record<string, unknown>,
  input: UpdateRecurringPatternInput,
): string | null {
  if (body.label === undefined) return null;
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) return 'label cannot be empty';
  input.label = label;
  return null;
}

function applyPatchIsActive(
  body: Record<string, unknown>,
  input: UpdateRecurringPatternInput,
): string | null {
  if (body.isActive === undefined) return null;
  if (typeof body.isActive !== 'boolean') return 'isActive must be a boolean';
  input.isActive = body.isActive;
  return null;
}

function applyPatchFrequency(
  body: Record<string, unknown>,
  input: UpdateRecurringPatternInput,
): string | null {
  if (body.frequency === undefined) return null;
  const freq = parseFrequency(body.frequency);
  if (!freq) return 'frequency must be WEEKLY, MONTHLY, or ANNUAL';
  input.frequency = freq;
  return null;
}

function applyPatchNextDate(
  body: Record<string, unknown>,
  input: UpdateRecurringPatternInput,
): string | null {
  if (body.nextOccurrenceDate === undefined) return null;
  if (body.nextOccurrenceDate !== null && typeof body.nextOccurrenceDate !== 'string') {
    return 'nextOccurrenceDate must be a string or null';
  }
  input.nextOccurrenceDate = body.nextOccurrenceDate as string | null;
  return null;
}

function parsePatchBody(
  body: Record<string, unknown>,
): UpdateRecurringPatternInput | { validationError: string } {
  const input: UpdateRecurringPatternInput = {};
  const error =
    applyPatchLabel(body, input) ??
    applyPatchIsActive(body, input) ??
    applyPatchFrequency(body, input) ??
    applyPatchNextDate(body, input);
  if (error) return { validationError: error };
  return input;
}

router.patch('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const body = ctx.request.body as Record<string, unknown>;
  const parsed = parsePatchBody(body);

  if ('validationError' in parsed) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: parsed.validationError };
    return;
  }

  const pattern = await updateRecurringPattern(userId(ctx), id, parsed);
  if (!pattern) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.body = pattern;
});

// ─── DELETE /api/recurring-patterns/:id ──────────────────────────────────────

router.delete('/:id', async (ctx: Router.RouterContext) => {
  const { id } = ctx.params as { id: string };
  const deleted = await deleteRecurringPattern(userId(ctx), id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND' };
    return;
  }
  ctx.status = 204;
});

export default router;
