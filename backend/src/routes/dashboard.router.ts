import Router from '@koa/router';
import { requireAuth } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboard.service.js';

const router = new Router({ prefix: '/api/dashboard' });

router.use(requireAuth);

// GET /api/dashboard
router.get('/', async (ctx: Router.RouterContext) => {
  const userId = ctx.state.user.sub as string;
  const data = await getDashboard(userId);
  ctx.body = data;
});

export default router;
