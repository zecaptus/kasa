import bodyParser from '@koa/bodyparser';
import Router from '@koa/router';
import Koa, { type Context, type Next } from 'koa';
import { accountRouter } from './routes/account.router';
import { authRouter } from './routes/auth.router';

function createApp(): Koa {
  const app = new Koa();
  const healthRouter = new Router();

  // Error-handler middleware
  app.use(async (ctx: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Internal server error');
      ctx.status = (err as { status?: number }).status ?? 500;
      ctx.body = { error: error.message };
      ctx.app.emit('error', error, ctx);
    }
  });

  // Body parsing
  app.use(bodyParser());

  // Health check
  healthRouter.get('/api/health', (ctx: Context) => {
    ctx.body = { status: 'ok' };
  });

  // Register routes
  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());
  app.use(authRouter.routes());
  app.use(authRouter.allowedMethods());
  app.use(accountRouter.routes());
  app.use(accountRouter.allowedMethods());

  return app;
}

const app = createApp();

// Default export for Vercel Functions compatibility
export default app.callback();

export { createApp };
