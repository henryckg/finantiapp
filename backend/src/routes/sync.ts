import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

app.get('/', async (c) => {
  const userId = getUserId(c);
  const since = Number(c.req.query('since') ?? 0);
  const tables = ['accounts', 'categories', 'transactions', 'investments', 'investment_value_snapshots', 'scheduled_expenses', 'goals', 'goal_allocations'];
  const result: Record<string, unknown[]> = {};
  for (const table of tables) {
    const rows = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE (updated_at > ? OR created_at > ?) AND user_id = ?`)
      .bind(since, since, userId)
      .all();
    result[table] = rows.results;
  }
  return c.json(result);
});

app.post('/push', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  // En una implementación completa, aquí se haría upsert de cada tabla
  // y se resolverían conflictos (el servidor gana).
  return c.json({ ok: true, pushed: 0, userId });
});

export const syncRoutes = app;
