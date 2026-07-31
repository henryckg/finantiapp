import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { accountsRoutes } from './routes/accounts';
import { transactionsRoutes } from './routes/transactions';
import { categoriesRoutes } from './routes/categories';
import { investmentsRoutes } from './routes/investments';
import { scheduledExpensesRoutes } from './routes/scheduledExpenses';
import { goalsRoutes } from './routes/goals';
import { syncRoutes } from './routes/sync';
import { reportsRoutes } from './routes/reports';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGIN: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = (c.env.CORS_ORIGIN ?? '').split(',').map((value: string) => value.trim()).filter(Boolean);
      return !origin || allowed.includes(origin) ? origin ?? allowed[0] ?? '*' : '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'If-None-Match'],
    exposeHeaders: ['ETag'],
    credentials: true,
  }),
);

app.route('/auth', authRoutes);
app.route('/accounts', accountsRoutes);
app.route('/transactions', transactionsRoutes);
app.route('/categories', categoriesRoutes);
app.route('/investments', investmentsRoutes);
app.route('/scheduled-expenses', scheduledExpensesRoutes);
app.route('/goals', goalsRoutes);
app.route('/sync', syncRoutes);
app.route('/reports', reportsRoutes);

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Error interno del servidor', detail: err instanceof Error ? err.message : String(err) }, 500);
});

app.get('/', (c) =>
  c.json({ name: 'Finanzas API', version: '0.0.1', status: 'ok' }),
);

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

export default app;
