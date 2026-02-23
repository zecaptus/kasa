import type { ExpenseCategory } from '@kasa/db';
import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import { createExpense, deleteExpense, listExpenses } from '../services/import.service.js';
import { confirmReconciliation, undoReconciliation } from '../services/reconciliation.service.js';

const router = new Router({ prefix: '/api/expenses' });

// All expenses routes require authentication
router.use(requireAuth);

// GET /api/expenses
router.get('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const limit = Math.min(Number(ctx.query.limit ?? 50), 200);
  const cursor = typeof ctx.query.cursor === 'string' ? ctx.query.cursor : undefined;
  const from = typeof ctx.query.from === 'string' ? ctx.query.from : undefined;
  const to = typeof ctx.query.to === 'string' ? ctx.query.to : undefined;
  const category =
    typeof ctx.query.category === 'string' ? (ctx.query.category as ExpenseCategory) : undefined;

  const result = await listExpenses(userId, {
    limit,
    cursor: cursor ?? undefined,
    from: from ?? undefined,
    to: to ?? undefined,
    category: category ?? undefined,
  });
  ctx.body = result;
});

// POST /api/expenses
router.post('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const body = ctx.request.body as {
    amount?: unknown;
    label?: unknown;
    date?: unknown;
    category?: unknown;
  };

  const amount = Number(body?.amount);
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const date = typeof body?.date === 'string' ? body.date : '';
  const category = body?.category as ExpenseCategory | undefined;

  const errors: Record<string, string> = {};
  if (!amount || amount <= 0) errors.amount = 'amount must be a positive number';
  if (!label) errors.label = 'label is required';
  if (label.length > 255) errors.label = 'label must be 255 characters or fewer';
  if (!date) errors.date = 'date is required (YYYY-MM-DD)';
  if (!category) errors.category = 'category is required';

  if (Object.keys(errors).length > 0) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', fields: errors };
    return;
  }

  const expense = await createExpense(userId, {
    amount,
    label,
    date,
    category: category as ExpenseCategory,
  });

  ctx.status = 201;
  ctx.body = { expense, reconciliationResults: { autoReconciled: [], awaitingReview: [] } };
});

// DELETE /api/expenses/:expenseId
router.delete('/:expenseId', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const { expenseId } = ctx.params as { expenseId: string };

  const deleted = await deleteExpense(userId, expenseId);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: 'Expense not found.' };
    return;
  }

  ctx.status = 204;
});

// POST /api/expenses/reconciliation/confirm
router.post('/reconciliation/confirm', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const body = ctx.request.body as {
    importedTransactionId?: string;
    manualExpenseId?: string;
  };

  if (!body?.importedTransactionId || !body?.manualExpenseId) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'importedTransactionId and manualExpenseId are required',
    };
    return;
  }

  const result = await confirmReconciliation(
    userId,
    body.importedTransactionId,
    body.manualExpenseId,
  );
  if (!result) {
    ctx.status = 400;
    ctx.body = {
      error: 'RECONCILIATION_FAILED',
      message: 'Items not found, already reconciled, or belong to different user',
    };
    return;
  }

  ctx.status = 201;
  ctx.body = result;
});

// DELETE /api/expenses/reconciliation/:reconciliationId
router.delete('/reconciliation/:reconciliationId', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub;
  const { reconciliationId } = ctx.params as { reconciliationId: string };

  const success = await undoReconciliation(userId, reconciliationId);
  if (!success) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: 'Reconciliation not found.' };
    return;
  }

  ctx.status = 204;
});

export default router;
