import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['stock_cl', 'stock_us', 'crypto', 'fund', 'etf', 'other']),
  ticker: z.string().nullable().optional(),
  currentValue: z.number(),
  currency: z.string().default('CLP'),
  notes: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const userId = getUserId(c);
  const result = await c.env.DB.prepare('SELECT * FROM investments WHERE user_id = ? ORDER BY name')
    .bind(userId)
    .all();
  return c.json(result.results);
});

app.get('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const investment = await c.env.DB.prepare('SELECT * FROM investments WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first();
  if (!investment) return c.json({ error: 'No encontrado' }, 404);

  const capitalRow = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(CASE WHEN type = 'investment_contribution' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'investment_withdrawal' THEN amount ELSE 0 END), 0) as capital FROM transactions WHERE investment_id = ? AND user_id = ?",
  )
    .bind(id, userId)
    .first() as { capital: number } | null;

  const capital = capitalRow?.capital ?? 0;
  const currentValue = (investment as { current_value: number }).current_value;
  const gain = currentValue - capital;
  const returnPct = capital > 0 ? (gain / capital) * 100 : null;

  return c.json({ ...investment, investedCapital: capital, gain, returnPct });
});

app.post('/', zValidator('json', createSchema), async (c) => {
  const userId = getUserId(c);
  const body = c.req.valid('json');
  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    'INSERT INTO investments (id, user_id, name, type, ticker, current_value, currency, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, body.name, body.type, body.ticker ?? null, body.currentValue, body.currency, body.notes ?? null, now, now)
    .run();
  return c.json({ id, userId, ...body, createdAt: now, updatedAt: now }, 201);
});

app.put('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();
  await c.env.DB.prepare(
    'UPDATE investments SET name = ?, type = ?, ticker = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(body.name, body.type, body.ticker ?? null, body.notes ?? null, now, id, userId)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM investments WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  await c.env.DB.prepare('DELETE FROM investment_value_snapshots WHERE investment_id = ?')
    .bind(id)
    .run();
  return c.json({ ok: true });
});

app.post('/:id/update-value', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const { value, date } = await c.req.json<{ value: number; date?: number }>();
  const now = Date.now();
  const ts = date ?? now;
  await c.env.DB.prepare('UPDATE investments SET current_value = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .bind(value, now, id, userId)
    .run();
  const snapId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO investment_value_snapshots (id, investment_id, value, date, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(snapId, id, value, ts, now)
    .run();
  return c.json({ ok: true, snapshotId: snapId });
});

app.get('/:id/snapshots', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    'SELECT * FROM investment_value_snapshots WHERE investment_id = ? ORDER BY date',
  )
    .bind(id)
    .all();
  return c.json(result.results);
});

app.get('/:id/movements', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    "SELECT * FROM transactions WHERE investment_id = ? AND user_id = ? AND type IN ('investment_contribution', 'investment_withdrawal') ORDER BY date DESC",
  )
    .bind(id, userId)
    .all();
  return c.json(result.results);
});

export const investmentsRoutes = app;
