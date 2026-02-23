import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';
import {
  getSessionWithTransactions,
  importCsv,
  listSessions,
  updateTransactionStatus,
} from '../services/import.service.js';

const router = new Router({ prefix: '/api/import' });

// All import routes require authentication
router.use(requireAuth);

// POST /api/import/csv
router.post('/csv', uploadMiddleware, async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;

  const file = ctx.request.file;
  if (!file) {
    ctx.status = 400;
    ctx.body = { error: 'MISSING_FILE', message: 'No file uploaded. Use field name "file".' };
    return;
  }

  try {
    const result = await importCsv(userId, file.originalname, file.buffer);
    ctx.status = 201;
    ctx.body = {
      ...result.session,
      newCount: result.newCount,
      skippedCount: result.skippedCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (msg === 'INVALID_CSV_FORMAT') {
      ctx.status = 400;
      ctx.body = {
        error: 'INVALID_CSV_FORMAT',
        message: 'Could not detect SG CSV header row. Please upload a valid SG bank export file.',
      };
      return;
    }
    throw err;
  }
});

// GET /api/import/sessions
router.get('/sessions', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const limit = Math.min(Number(ctx.query.limit ?? 20), 100);
  const cursor = typeof ctx.query.cursor === 'string' ? ctx.query.cursor : undefined;

  const result = await listSessions(userId, limit, cursor);
  ctx.body = result;
});

// GET /api/import/sessions/:sessionId
router.get('/sessions/:sessionId', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const { sessionId } = ctx.params as { sessionId: string };

  const session = await getSessionWithTransactions(userId, sessionId);
  if (!session) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: 'Session not found.' };
    return;
  }

  ctx.body = session;
});

// PATCH /api/import/transactions/:transactionId
router.patch('/transactions/:transactionId', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const { transactionId } = ctx.params as { transactionId: string };
  const body = ctx.request.body as { status?: string };

  const status = body?.status;
  if (status !== 'IGNORED' && status !== 'UNRECONCILED') {
    ctx.status = 400;
    ctx.body = {
      error: 'INVALID_STATUS',
      message: 'status must be "IGNORED" or "UNRECONCILED".',
    };
    return;
  }

  const updated = await updateTransactionStatus(userId, transactionId, status);
  if (!updated) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: 'Transaction not found.' };
    return;
  }

  ctx.body = updated;
});

export default router;
