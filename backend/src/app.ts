import bodyParser from '@koa/bodyparser';
import Router from '@koa/router';
import Koa, { type Context, type Next } from 'koa';
import { accountRouter } from './routes/account.router';
import { authRouter } from './routes/auth.router';
import bankAccountsRouter from './routes/bankAccounts.router';
import categoriesRouter from './routes/categories.router';
import dashboardRouter from './routes/dashboard.router';
import expensesRouter from './routes/expenses.router';
import importRouter from './routes/import.router';
import pocketsRouter from './routes/pockets.router';
import recurringPatternsRouter from './routes/recurringPatterns.router';
import transactionsRouter from './routes/transactions.router';
import transferLabelRulesRouter from './routes/transferLabels.router';

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
  app.use(importRouter.routes());
  app.use(importRouter.allowedMethods());
  app.use(expensesRouter.routes());
  app.use(expensesRouter.allowedMethods());
  app.use(transactionsRouter.routes());
  app.use(transactionsRouter.allowedMethods());
  app.use(categoriesRouter.routes());
  app.use(categoriesRouter.allowedMethods());
  app.use(dashboardRouter.routes());
  app.use(dashboardRouter.allowedMethods());
  app.use(pocketsRouter.routes());
  app.use(pocketsRouter.allowedMethods());
  app.use(bankAccountsRouter.routes());
  app.use(bankAccountsRouter.allowedMethods());
  app.use(recurringPatternsRouter.routes());
  app.use(recurringPatternsRouter.allowedMethods());
  app.use(transferLabelRulesRouter.routes());
  app.use(transferLabelRulesRouter.allowedMethods());

  return app;
}

const app = createApp();

// Default export for Vercel Functions compatibility
export default app.callback();

export { createApp };
