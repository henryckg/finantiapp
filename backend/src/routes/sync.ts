import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../index';
import { authMiddleware, getUserId } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();
app.use('*', authMiddleware);

const syncSchema = z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).default({});

const pullQueries: Record<string, string> = {
  accounts: 'SELECT * FROM accounts WHERE (updated_at > ? OR created_at > ?) AND user_id = ?',
  categories: 'SELECT * FROM categories WHERE created_at > ? AND user_id = ?',
  transactions: 'SELECT * FROM transactions WHERE (updated_at > ? OR created_at > ?) AND user_id = ?',
  investments: 'SELECT * FROM investments WHERE (updated_at > ? OR created_at > ?) AND user_id = ?',
  snapshots: `SELECT s.* FROM investment_value_snapshots s JOIN investments i ON i.id = s.investment_id WHERE s.created_at > ? AND i.user_id = ?`,
  scheduledExpenses: 'SELECT * FROM scheduled_expenses WHERE (updated_at > ? OR created_at > ?) AND user_id = ?',
  goals: 'SELECT * FROM goals WHERE (updated_at > ? OR created_at > ?) AND user_id = ?',
  goalAllocations: `SELECT a.* FROM goal_allocations a JOIN goals g ON g.id = a.goal_id WHERE a.created_at > ? AND g.user_id = ?`,
};

const tableNames: Record<string, string> = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  investments: 'investments',
  snapshots: 'investment_value_snapshots',
  scheduledExpenses: 'scheduled_expenses',
  goals: 'goals',
  goalAllocations: 'goal_allocations',
};

app.get('/', async (c) => {
  const userId = getUserId(c);
  const since = Math.max(0, Number(c.req.query('since') ?? 0) || 0);
  const result: Record<string, unknown[]> = {};

  for (const [key, query] of Object.entries(pullQueries)) {
    const usesSingleSince = key === 'categories' || key === 'snapshots' || key === 'goalAllocations';
    const rows = usesSingleSince
      ? await c.env.DB.prepare(query).bind(since, userId).all()
      : await c.env.DB.prepare(query).bind(since, since, userId).all();
    result[key] = rows.results.map((row) => toClientRecord(row as Record<string, unknown>));
  }
  return c.json(result);
});

app.post('/push', async (c) => {
  const userId = getUserId(c);
  const parsed = syncSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Payload de sincronización inválido' }, 400);

  let pushed = 0;
  for (const [store, records] of Object.entries(parsed.data)) {
    const table = tableNames[store];
    if (!table) continue;

    for (const record of records) {
      const id = typeof record.id === 'string' ? record.id : null;
      if (!id) continue;
      const owned = await ownsRecord(c.env.DB, store, id, userId);
      const normalized = normalizeRecord(store, record, userId);
      if (!owned && !(await canCreateRecord(c.env.DB, store, normalized, userId)) && !['accounts', 'categories', 'transactions', 'investments', 'scheduledExpenses', 'goals'].includes(store)) continue;
      const columns = Object.keys(normalized);
      const values = columns.map((column) => normalized[column]);
      const placeholders = columns.map(() => '?').join(', ');
      const updates = columns.filter((column) => column !== 'id').map((column) => `${column}=excluded.${column}`).join(', ');
      await c.env.DB.prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
      ).bind(...values).run();
      pushed += 1;
    }
  }

  return c.json({ ok: true, pushed });
});

async function ownsRecord(db: D1Database, store: string, id: string, userId: string): Promise<boolean> {
  const queries: Record<string, string> = {
    snapshots: 'SELECT 1 FROM investment_value_snapshots s JOIN investments i ON i.id=s.investment_id WHERE s.id=? AND i.user_id=?',
    goalAllocations: 'SELECT 1 FROM goal_allocations a JOIN goals g ON g.id=a.goal_id WHERE a.id=? AND g.user_id=?',
  };
  const query = queries[store] ?? `SELECT 1 FROM ${tableNames[store]} WHERE id=? AND user_id=?`;
  return Boolean(await db.prepare(query).bind(id, userId).first());
}

async function canCreateRecord(db: D1Database, store: string, record: Record<string, unknown>, userId: string): Promise<boolean> {
  if (store === 'snapshots') {
    return Boolean(await db.prepare('SELECT 1 FROM investments WHERE id=? AND user_id=?').bind(record.investment_id, userId).first());
  }
  if (store === 'goalAllocations') {
    return Boolean(await db.prepare('SELECT 1 FROM goals WHERE id=? AND user_id=?').bind(record.goal_id, userId).first());
  }
  return false;
}

function toClientRecord(row: Record<string, unknown>): Record<string, unknown> {
  const names: Record<string, string> = {
    user_id: 'userId', created_at: 'createdAt', updated_at: 'updatedAt', is_active: 'isActive',
    to_account_id: 'toAccountId', investment_id: 'investmentId', category_id: 'categoryId',
    sync_status: 'syncStatus', current_value: 'currentValue', estimated_date: 'estimatedDate',
    linked_transaction_id: 'linkedTransactionId', target_amount: 'targetAmount', target_date: 'targetDate',
    goal_id: 'goalId', account_id: 'accountId',
  };
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [names[key] ?? key, value]));
}

function normalizeRecord(store: string, record: Record<string, unknown>, userId: string): Record<string, unknown> {
  const fields: Record<string, string[]> = {
    accounts: ['id', 'user_id', 'name', 'type', 'currency', 'balance', 'color', 'icon', 'is_active', 'created_at', 'updated_at'],
    categories: ['id', 'user_id', 'name', 'icon', 'color', 'type', 'is_default', 'created_at'],
    transactions: ['id', 'user_id', 'type', 'amount', 'account_id', 'to_account_id', 'investment_id', 'category_id', 'description', 'date', 'notes', 'sync_status', 'created_at', 'updated_at'],
    investments: ['id', 'user_id', 'name', 'type', 'ticker', 'current_value', 'currency', 'notes', 'created_at', 'updated_at'],
    snapshots: ['id', 'investment_id', 'value', 'date', 'created_at'],
    scheduledExpenses: ['id', 'user_id', 'name', 'amount', 'status', 'estimated_date', 'category_id', 'linked_transaction_id', 'notes', 'created_at', 'updated_at'],
    goals: ['id', 'user_id', 'name', 'target_amount', 'target_date', 'status', 'notes', 'created_at', 'updated_at'],
    goalAllocations: ['id', 'goal_id', 'investment_id', 'account_id', 'target_amount', 'created_at'],
  };
  const aliases: Record<string, string> = { userId: 'user_id', createdAt: 'created_at', updatedAt: 'updated_at', isActive: 'is_active', toAccountId: 'to_account_id', investmentId: 'investment_id', categoryId: 'category_id', syncStatus: 'sync_status', currentValue: 'current_value', estimatedDate: 'estimated_date', linkedTransactionId: 'linked_transaction_id', targetAmount: 'target_amount', targetDate: 'target_date' };
  const result: Record<string, unknown> = {};
  for (const column of fields[store] ?? []) {
    const camel = Object.entries(aliases).find(([, value]) => value === column)?.[0];
    result[column] = record[column] ?? (camel ? record[camel] : undefined) ?? null;
  }
  if (fields[store]?.includes('user_id')) result.user_id = userId;
  if (fields[store]?.includes('sync_status')) result.sync_status = 'synced';
  return result;
}

export const syncRoutes = app;
