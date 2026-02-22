import jwt from 'jsonwebtoken';
import type { Context, Next } from 'koa';
import { config } from '../config';
import type { AuthenticatedUser } from '../types/koa';

export async function requireAuth(ctx: Context, next: Next): Promise<void> {
  const token = ctx.cookies.get('access_token');
  if (!token) {
    ctx.throw(401, 'Unauthorized');
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as AuthenticatedUser;
    ctx.state.user = payload;
  } catch {
    ctx.throw(401, 'Unauthorized');
  }

  await next();
}
