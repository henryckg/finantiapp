import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

const createSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer', 'investment_contribution', 'investment_withdrawal', 'debt_payment']),
  amount: z.number().positive(),
  accountId: z.string(),
  toAccountId: z.string().nullable().optional(),
  investmentId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  date: z.number(),
  notes: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const userId = getUserId(c);
  const { from, to, account, category, type, limit, offset } = c.req.query();
  let sql = 'SELECT * FROM transactions WHERE user_id = ?';
  const binds: unknown[] = [userId];
  if (from) { sql += ' AND date >= ?'; binds.push(Number(from)); }
  if (to) { sql += ' AND date <= ?'; binds.push(Number(to)); }
  if (account) { sql += ' AND (account_id = ? OR to_account_id = ?)'; binds.push(account, account); }
  if (category) { sql += ' AND category_id = ?'; binds.push(category); }
  if (type) { sql += ' AND type = ?'; binds.push(type); }
  sql += ' ORDER BY date DESC';
  if (limit) { sql += ' LIMIT ?'; binds.push(Number(limit)); }
  if (offset) { sql += ' OFFSET ?'; binds.push(Number(offset)); }
  const result = await c.env.DB.prepare(sql).bind(...binds).all();
  if (c.req.query('shortcut') === 'true') {
    return c.json(result.results.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description,
    })));
  }
  return c.json(result.results);
});

app.post('/', zValidator('json', createSchema), async (c) => {
  const userId = getUserId(c);
  const body = c.req.valid('json');
  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(
    'INSERT INTO transactions (id, user_id, type, amount, account_id, to_account_id, investment_id, category_id, description, date, notes, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, body.type, body.amount, body.accountId, body.toAccountId ?? null, body.investmentId ?? null, body.categoryId ?? null, body.description ?? null, body.date, body.notes ?? null, 'synced', now, now)
    .run();
  return c.json({ id, userId, ...body, syncStatus: 'synced', createdAt: now, updatedAt: now }, 201);
});

app.put('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = Date.now();
  await c.env.DB.prepare(
    'UPDATE transactions SET type = ?, amount = ?, account_id = ?, to_account_id = ?, investment_id = ?, category_id = ?, description = ?, date = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(body.type, body.amount, body.accountId, body.toAccountId ?? null, body.investmentId ?? null, body.categoryId ?? null, body.description ?? null, body.date, body.notes ?? null, now, id, userId)
    .run();
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  return c.json({ ok: true });
});

export const transactionsRoutes = app;
