import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Account,
  Category,
  Goal,
  GoalAllocation,
  Investment,
  InvestmentValueSnapshot,
  ScheduledExpense,
  Transaction,
} from '../types';
import { DB_NAME, DB_VERSION } from './config';
import { DEMO_SEED } from './seed';

interface FinanzasDB extends DBSchema {
  accounts: { key: string; value: Account };
  categories: { key: string; value: Category };
  transactions: { key: string; value: Transaction; indexes: { byDate: number } };
  investments: { key: string; value: Investment };
  snapshots: {
    key: string;
    value: InvestmentValueSnapshot;
    indexes: { byInvestment: string };
  };
  scheduledExpenses: { key: string; value: ScheduledExpense };
  goals: { key: string; value: Goal };
  goalAllocations: { key: string; value: GoalAllocation; indexes: { byGoal: string } };
  meta: { key: string; value: unknown };
}

export type StoreName =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'investments'
  | 'snapshots'
  | 'scheduledExpenses'
  | 'goals'
  | 'goalAllocations';

const ALL_STORES: StoreName[] = [
  'accounts',
  'categories',
  'transactions',
  'investments',
  'snapshots',
  'scheduledExpenses',
  'goals',
  'goalAllocations',
];

let dbPromise: Promise<IDBPDatabase<FinanzasDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FinanzasDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB no está disponible en este entorno.'));
  }
  if (!dbPromise) {
    dbPromise = openDB<FinanzasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('byDate', 'date');
        }
        if (!db.objectStoreNames.contains('investments')) {
          db.createObjectStore('investments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const store = db.createObjectStore('snapshots', { keyPath: 'id' });
          store.createIndex('byInvestment', 'investmentId');
        }
        if (!db.objectStoreNames.contains('scheduledExpenses')) {
          db.createObjectStore('scheduledExpenses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('goalAllocations')) {
          const store = db.createObjectStore('goalAllocations', { keyPath: 'id' });
          store.createIndex('byGoal', 'goalId');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAll<T extends StoreName>(store: T): Promise<FinanzasDB[T]['value'][]> {
  const db = await getDB();
  return db.getAll(store);
}

export async function put<T extends StoreName>(
  store: T,
  value: FinanzasDB[T]['value'],
): Promise<void> {
  const db = await getDB();
  await db.put(store, value);
}

export async function putMany<T extends StoreName>(
  store: T,
  values: FinanzasDB[T]['value'][],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  await Promise.all([...values.map((value) => tx.store.put(value)), tx.done]);
}

export async function remove<T extends StoreName>(store: T, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([...ALL_STORES, 'meta'], 'readwrite');
  await Promise.all([
    ...ALL_STORES.map((store) => tx.objectStore(store).clear()),
    tx.objectStore('meta').clear(),
    tx.done,
  ]);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get('meta', key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', value, key);
}

export interface Snapshot {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  investments: Investment[];
  snapshots: InvestmentValueSnapshot[];
  scheduledExpenses: ScheduledExpense[];
  goals: Goal[];
  goalAllocations: GoalAllocation[];
}

export async function loadSnapshot(): Promise<Snapshot> {
  const [
    accounts,
    categories,
    transactions,
    investments,
    snapshots,
    scheduledExpenses,
    goals,
    goalAllocations,
  ] = await Promise.all([
    getAll('accounts'),
    getAll('categories'),
    getAll('transactions'),
    getAll('investments'),
    getAll('snapshots'),
    getAll('scheduledExpenses'),
    getAll('goals'),
    getAll('goalAllocations'),
  ]);

  return {
    accounts,
    categories,
    transactions,
    investments,
    snapshots,
    scheduledExpenses,
    goals,
    goalAllocations,
  };
}

export const DEMO_SEED_KEY = 'demoSeedVersion';
export const DEMO_SEED_VERSION = 1;

export async function seedDemoIfNeeded(force = false): Promise<void> {
  const current = await getMeta<number>(DEMO_SEED_KEY);
  if (!force && current === DEMO_SEED_VERSION) return;

  await clearAll();
  await Promise.all([
    putMany('accounts', DEMO_SEED.accounts),
    putMany('categories', DEMO_SEED.categories),
    putMany('transactions', DEMO_SEED.transactions),
    putMany('investments', DEMO_SEED.investments),
    putMany('snapshots', DEMO_SEED.snapshots),
    putMany('scheduledExpenses', DEMO_SEED.scheduledExpenses),
    putMany('goals', DEMO_SEED.goals),
    putMany('goalAllocations', DEMO_SEED.goalAllocations),
  ]);
  await setMeta(DEMO_SEED_KEY, DEMO_SEED_VERSION);
}

export async function resetDemo(): Promise<void> {
  await seedDemoIfNeeded(true);
}
