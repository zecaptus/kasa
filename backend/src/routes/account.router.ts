import Router from '@koa/router';
import type { Context } from 'koa';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { updateProfile } from '../services/account.service';

const accountRouter = new Router({ prefix: '/api/account' });

// ── Validation schemas ───────────────────────────────────────────────

const updateProfileSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100).optional(),
    locale: z.enum(['FR', 'EN']).optional(),
  })
  .refine((data) => data.name !== undefined || data.locale !== undefined, {
    message: 'At least one field must be provided',
  });

// ── PATCH /api/account/profile ──────────────────────────────────────

accountRouter.patch('/profile', requireAuth, async (ctx: Context) => {
  const result = updateProfileSchema.safeParse(ctx.request.body);
  if (!result.success) {
    ctx.status = 422;
    ctx.body = {
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
    return;
  }

  const user = await updateProfile(ctx.state.user.sub, result.data);

  ctx.status = 200;
  ctx.body = user;
});

export { accountRouter };
