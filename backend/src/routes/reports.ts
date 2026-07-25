import { Hono } from 'hono';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

app.get('/summary', async (c) => {
  const userId = getUserId(c);
  const { month, year } = c.req.query();
  const now = new Date();
  const m = month ? Number(month) - 1 : now.getMonth();
  const y = year ? Number(year) : now.getFullYear();
  const from = new Date(y, m, 1).getTime();
  const to = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();

  const income = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?",
  )
    .bind(userId, from, to)
    .first() as { total: number } | null;

  const expense = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type IN ('expense', 'debt_payment') AND date >= ? AND date <= ?",
  )
    .bind(userId, from, to)
    .first() as { total: number } | null;

  return c.json({ income: income?.total ?? 0, expense: expense?.total ?? 0, from, to });
});

app.get('/by-category', async (c) => {
  const userId = getUserId(c);
  const from = Number(c.req.query('from') ?? 0);
  const to = Number(c.req.query('to') ?? Date.now());
  const result = await c.env.DB.prepare(
    "SELECT category_id, COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type IN ('expense', 'debt_payment') AND date >= ? AND date <= ? GROUP BY category_id ORDER BY total DESC",
  )
    .bind(userId, from, to)
    .all();
  return c.json(result.results);
});

app.get('/patrimony', async (c) => {
  const userId = getUserId(c);
  const investments = await c.env.DB.prepare('SELECT COALESCE(SUM(current_value), 0) as total FROM investments WHERE user_id = ?')
    .bind(userId)
    .first() as { total: number } | null;
  return c.json({ invested: investments?.total ?? 0 });
});

app.get('/profitability', async (c) => {
  const userId = getUserId(c);
  const result = await c.env.DB.prepare(
    `SELECT i.id, i.name, i.current_value,
       COALESCE((SELECT SUM(CASE WHEN t.type = 'investment_contribution' THEN t.amount ELSE -t.amount END) FROM transactions t WHERE t.investment_id = i.id AND t.user_id = ?), 0) as capital
     FROM investments i WHERE i.user_id = ? ORDER BY i.name`,
  )
    .bind(userId, userId)
    .all();
  return c.json(result.results);
});

export const reportsRoutes = app;
