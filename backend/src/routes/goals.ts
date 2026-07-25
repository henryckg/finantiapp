import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  targetDate: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const userId = getUserId(c);
  const result = await c.env.DB.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all();
  return c.json(result.results);
});

app.post('/', zValidator('json', createSchema), async (c) => {
  const userId = getUserId(c);
  const body = c.req.valid('json');
  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    'INSERT INTO goals (id, user_id, name, target_amount, target_date, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, body.name, body.targetAmount, body.targetDate ?? null, 'active', body.notes ?? null, now, now)
    .run();
  return c.json({ id, userId, ...body, status: 'active', createdAt: now, updatedAt: now }, 201);
});

app.put('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();
  await c.env.DB.prepare(
    'UPDATE goals SET name = ?, target_amount = ?, target_date = ?, status = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(body.name, body.targetAmount, body.targetDate ?? null, body.status ?? 'active', body.notes ?? null, now, id, userId)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  await c.env.DB.prepare('DELETE FROM goal_allocations WHERE goal_id = ?')
    .bind(id)
    .run();
  return c.json({ ok: true });
});

app.post('/:id/allocations', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const allocId = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    'INSERT INTO goal_allocations (id, goal_id, investment_id, account_id, target_amount, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(allocId, id, body.investmentId ?? null, body.accountId ?? null, body.targetAmount, now)
    .run();
  return c.json({ id: allocId, goalId: id, ...body, createdAt: now }, 201);
});

app.delete('/:id/allocations/:allocId', async (c) => {
  const allocId = c.req.param('allocId');
  await c.env.DB.prepare('DELETE FROM goal_allocations WHERE id = ?')
    .bind(allocId)
    .run();
  return c.json({ ok: true });
});

export const goalsRoutes = app;
