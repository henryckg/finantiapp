import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  type: z.enum(['expense', 'income', 'both']),
  isDefault: z.boolean().default(false),
});

app.get('/', async (c) => {
  const userId = getUserId(c);
  const result = await c.env.DB.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name')
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
    'INSERT INTO categories (id, user_id, name, icon, color, type, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, body.name, body.icon ?? null, body.color ?? null, body.type, body.isDefault ? 1 : 0, now)
    .run();
  return c.json({ id, userId, ...body, createdAt: now }, 201);
});

app.put('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(
    'UPDATE categories SET name = ?, icon = ?, color = ?, type = ? WHERE id = ? AND user_id = ?',
  )
    .bind(body.name, body.icon ?? null, body.color ?? null, body.type, id, userId)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  return c.json({ ok: true });
});

export const categoriesRoutes = app;
