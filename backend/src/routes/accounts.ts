import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['bank', 'digital_wallet', 'cash', 'other']),
  currency: z.string().default('CLP'),
  balance: z.number().default(0),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

app.get('/', async (c) => {
  const userId = getUserId(c);
  const result = await c.env.DB.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at')
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
    'INSERT INTO accounts (id, user_id, name, type, currency, balance, color, icon, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, body.name, body.type, body.currency, body.balance, body.color ?? null, body.icon ?? null, body.isActive ? 1 : 0, now, now)
    .run();
  return c.json({ id, ...body, userId, createdAt: now, updatedAt: now }, 201);
});

app.put('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();
  await c.env.DB.prepare(
    'UPDATE accounts SET name = ?, type = ?, color = ?, icon = ?, is_active = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(body.name, body.type, body.color ?? null, body.icon ?? null, body.isActive ? 1 : 0, now, id, userId)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  return c.json({ ok: true });
});

export const accountsRoutes = app;
