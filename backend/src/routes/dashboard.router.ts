import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import type { DateRangeParams } from '../services/dashboard.service.js';
import { getDashboard } from '../services/dashboard.service.js';

const router = new Router({ prefix: '/api/dashboard' });

router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;

  const params: DateRangeParams = {};
  const from = ctx.query.from;
  const to = ctx.query.to;

  if (typeof from === 'string' && DATE_RE.test(from)) {
    params.from = from;
  }
  if (typeof to === 'string' && DATE_RE.test(to)) {
    params.to = to;
  }

  const data = await getDashboard(userId, params);
  ctx.body = data;
});

export default router;
