import Router from '@koa/router';
import type { Context } from 'koa';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getMe, login, logout, register, rotateRefreshToken } from '../services/auth.service';

const authRouter = new Router({ prefix: '/api/auth' });

// ── Validation schemas ───────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

// ── POST /api/auth/register ──────────────────────────────────────────

authRouter.post('/register', async (ctx: Context) => {
  const result = registerSchema.safeParse(ctx.request.body);
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

  const { email, password, name } = result.data;
  const user = await register(email, password, name, ctx);

  ctx.status = 201;
  ctx.body = user;
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ── POST /api/auth/login ────────────────────────────────────────────

authRouter.post('/login', async (ctx: Context) => {
  const result = loginSchema.safeParse(ctx.request.body);
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

  const { email, password } = result.data;
  const user = await login(email, password, ctx);

  ctx.status = 200;
  ctx.body = user;
});

// ── POST /api/auth/refresh ──────────────────────────────────────────

authRouter.post('/refresh', async (ctx: Context) => {
  const token = ctx.cookies.get('refresh_token');
  if (!token) {
    ctx.throw(401, 'No refresh token');
  }

  const user = await rotateRefreshToken(token, ctx);

  ctx.status = 200;
  ctx.body = user;
});

// ── GET /api/auth/me ────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (ctx: Context) => {
  const user = await getMe(ctx.state.user.sub);
  if (!user) {
    ctx.throw(401, 'User not found');
  }

  ctx.status = 200;
  ctx.body = user;
});

// ── POST /api/auth/logout ───────────────────────────────────────────

authRouter.post('/logout', requireAuth, async (ctx: Context) => {
  const refreshToken = ctx.cookies.get('refresh_token');
  await logout(refreshToken, ctx);

  ctx.status = 204;
});

export { authRouter };
