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

app.get('/profitability/compare', async (c) => {
  const userId = getUserId(c);
  const from = Number(c.req.query('from') ?? 0) || 0;
  const to = Number(c.req.query('to') ?? Date.now()) || Date.now();
  if (from > to) return c.json({ error: 'Rango de fechas inválido' }, 400);
  const result = await c.env.DB.prepare(
    `SELECT i.id, i.name, i.current_value AS current_value,
      COALESCE(SUM(CASE WHEN t.type = 'investment_contribution' THEN t.amount WHEN t.type = 'investment_withdrawal' THEN -t.amount ELSE 0 END), 0) AS capital,
      COALESCE(SUM(CASE WHEN t.type = 'investment_contribution' AND t.date BETWEEN ? AND ? THEN t.amount WHEN t.type = 'investment_withdrawal' AND t.date BETWEEN ? AND ? THEN -t.amount ELSE 0 END), 0) AS period_contribution
     FROM investments i LEFT JOIN transactions t ON t.investment_id = i.id AND t.user_id = i.user_id
     WHERE i.user_id = ? GROUP BY i.id ORDER BY i.name`,
  )
    .bind(from, to, from, to, userId)
    .all();
  return c.json({ from, to, investments: result.results });
});

app.get('/goals/:id/progress', async (c) => {
  const userId = getUserId(c);
  const goalId = c.req.param('id');
  const goal = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').bind(goalId, userId).first();
  if (!goal) return c.json({ error: 'Objetivo no encontrado' }, 404);
  const createdAt = (goal as { created_at: number }).created_at;
  const createdAtStartOfDay = new Date(
    new Date(createdAt).getFullYear(),
    new Date(createdAt).getMonth(),
    new Date(createdAt).getDate(),
  ).getTime();
  const allocations = await c.env.DB.prepare(
    `SELECT a.id, a.target_amount, a.investment_id, a.account_id,
      COALESCE((SELECT SUM(CASE WHEN t.type = 'investment_contribution' THEN t.amount WHEN t.type = 'investment_withdrawal' THEN -t.amount ELSE 0 END) FROM transactions t WHERE t.user_id = ? AND t.investment_id = a.investment_id AND t.date >= ?), 0) AS investment_progress,
      COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.user_id = ? AND t.to_account_id = a.account_id AND t.type = 'transfer' AND t.date >= ?), 0) AS account_progress
     FROM goal_allocations a WHERE a.goal_id = ?`,
  )
    .bind(userId, createdAtStartOfDay, userId, createdAtStartOfDay, goalId)
    .all();
  const rows = allocations.results as Array<{ target_amount: number; investment_progress: number; account_progress: number }>;
  const progress = rows.reduce((sum, row) => sum + Math.max(row.investment_progress || row.account_progress || 0, 0), 0);
  const targetAmount = (goal as { target_amount: number }).target_amount;
  return c.json({ goal, allocations: allocations.results, progress, remaining: Math.max(targetAmount - progress, 0), progressPct: targetAmount > 0 ? Math.min((progress / targetAmount) * 100, 100) : 0 });
});

export const reportsRoutes = app;
