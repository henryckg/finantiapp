import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  estimatedDate: z.number(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const userId = getUserId(c);
  const { status } = c.req.query();
  let sql = 'SELECT * FROM scheduled_expenses WHERE user_id = ?';
  const binds: unknown[] = [userId];
  if (status) { sql += ' AND status = ?'; binds.push(status); }
  sql += ' ORDER BY estimated_date';
  const result = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json(result.results);
});

app.post('/', zValidator('json', createSchema), async (c) => {
  const userId = getUserId(c);
  const body = c.req.valid('json');
  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    'INSERT INTO scheduled_expenses (id, user_id, name, amount, status, estimated_date, category_id, linked_transaction_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, body.name, body.amount, 'pending', body.estimatedDate, body.categoryId ?? null, null, body.notes ?? null, now, now)
    .run();
  return c.json({ id, userId, ...body, status: 'pending', linkedTransactionId: null, createdAt: now, updatedAt: now }, 201);
});

app.put('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();
  await c.env.DB.prepare(
    'UPDATE scheduled_expenses SET name = ?, amount = ?, estimated_date = ?, category_id = ?, notes = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(body.name, body.amount, body.estimatedDate, body.categoryId ?? null, body.notes ?? null, body.status ?? 'pending', now, id, userId)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM scheduled_expenses WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  return c.json({ ok: true });
});

app.post('/:id/mark-paid', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const { accountId, date } = await c.req.json<{ accountId: string; date?: number }>();
  const expense = await c.env.DB.prepare('SELECT * FROM scheduled_expenses WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first() as { id: string; name: string; amount: number; category_id: string | null; notes: string | null } | null;
  if (!expense) return c.json({ error: 'No encontrado' }, 404);

  const txId = crypto.randomUUID();
  const now = Date.now();
  const ts = date ?? now;
  await c.env.DB.prepare(
    'INSERT INTO transactions (id, user_id, type, amount, account_id, to_account_id, investment_id, category_id, description, date, notes, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(txId, userId, 'expense', expense.amount, accountId, null, null, expense.category_id, expense.name, ts, expense.notes, 'synced', now, now)
    .run();

  await c.env.DB.prepare(
    'UPDATE scheduled_expenses SET status = ?, linked_transaction_id = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind('paid', txId, now, id, userId)
    .run();

  return c.json({ ok: true, transactionId: txId });
});

export const scheduledExpensesRoutes = app;
