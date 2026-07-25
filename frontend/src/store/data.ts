import { create } from 'zustand';
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
import { IS_DEMO } from '../lib/config';
import {
  loadSnapshot,
  put,
  remove,
  resetDemo,
  seedDemoIfNeeded,
  type Snapshot,
  type StoreName,
} from '../lib/db';
import { syncNow } from '../lib/sync';
import { useAuthStore } from './auth';

type NewRecord<T> = Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>;

const emptySnapshot: Snapshot = {
  accounts: [],
  categories: [],
  transactions: [],
  investments: [],
  snapshots: [],
  scheduledExpenses: [],
  goals: [],
  goalAllocations: [],
};

function uid(): string {
  return crypto.randomUUID();
}

function ownerId(): string {
  return useAuthStore.getState().user?.id ?? 'demo-user';
}

const nextSyncStatus = () => (IS_DEMO ? ('synced' as const) : ('pending' as const));

interface DataState extends Snapshot {
  ready: boolean;
  loading: boolean;
  error: string | null;
  syncing: boolean;
  lastSyncError: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  resetDemoData: () => Promise<void>;

  createAccount: (input: NewRecord<Account>) => Promise<Account>;
  updateAccount: (id: string, patch: Partial<NewRecord<Account>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  createCategory: (input: NewRecord<Category>) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<NewRecord<Category>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  createTransaction: (input: NewRecord<Transaction>) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<NewRecord<Transaction>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  createInvestment: (input: NewRecord<Investment>) => Promise<Investment>;
  updateInvestment: (
    id: string,
    patch: Partial<Pick<Investment, 'name' | 'type' | 'ticker' | 'notes'>>,
  ) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  updateInvestmentValue: (id: string, value: number, date?: number) => Promise<void>;

  createScheduledExpense: (input: NewRecord<ScheduledExpense>) => Promise<ScheduledExpense>;
  updateScheduledExpense: (
    id: string,
    patch: Partial<NewRecord<ScheduledExpense>>,
  ) => Promise<void>;
  deleteScheduledExpense: (id: string) => Promise<void>;
  markScheduledExpensePaid: (id: string, accountId: string, date?: number) => Promise<void>;

  createGoal: (input: NewRecord<Goal>) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<NewRecord<Goal>>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  createGoalAllocation: (
    input: Omit<GoalAllocation, 'id' | 'createdAt' | 'syncStatus'>,
  ) => Promise<GoalAllocation>;
  deleteGoalAllocation: (id: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => {
  async function persist<K extends StoreName>(store: K, record: Snapshot[K][number]) {
    await put(store, record as never);
  }

  function replaceInState<K extends keyof Snapshot>(key: K, records: Snapshot[K]) {
    set({ [key]: records } as unknown as Partial<DataState>);
  }

  async function upsert<K extends StoreName>(store: K, record: Snapshot[K][number]) {
    await persist(store, record);
    const current = get()[store] as { id: string }[];
    const exists = current.some((item) => item.id === record.id);
    const next = exists
      ? current.map((item) => (item.id === record.id ? record : item))
      : [...current, record];
    replaceInState(store, next as Snapshot[K]);
  }

  async function drop<K extends StoreName>(store: K, id: string) {
    await remove(store, id);
    const current = get()[store] as Snapshot[K];
    replaceInState(
      store,
      current.filter((item) => item.id !== id) as Snapshot[K],
    );
  }

  function find<K extends StoreName>(store: K, id: string): Snapshot[K][number] | undefined {
    return (get()[store] as Snapshot[K]).find((item) => item.id === id);
  }

  return {
    ...emptySnapshot,
    ready: false,
    loading: false,
    error: null,
    syncing: false,
    lastSyncError: null,

    load: async () => {
      set({ loading: true, error: null });
      try {
        if (IS_DEMO) {
          await seedDemoIfNeeded();
        }
        const snapshot = await loadSnapshot();
        set({ ...snapshot, ready: true, loading: false });
        if (!IS_DEMO) {
          void get().sync();
        }
      } catch (error) {
        set({
          loading: false,
          ready: true,
          error: error instanceof Error ? error.message : 'No se pudieron cargar los datos',
        });
      }
    },

    refresh: async () => {
      const snapshot = await loadSnapshot();
      set({ ...snapshot });
    },

    sync: async () => {
      if (IS_DEMO) return;
      set({ syncing: true });
      const result = await syncNow();
      if (!result.skipped && !result.error) {
        await get().refresh();
      }
      set({ syncing: false, lastSyncError: result.error ?? null });
    },

    resetDemoData: async () => {
      await resetDemo();
      await get().refresh();
    },

    createAccount: async (input) => {
      const now = Date.now();
      const record: Account = {
        ...input,
        id: uid(),
        userId: ownerId(),
        createdAt: now,
        updatedAt: now,
        syncStatus: nextSyncStatus(),
      };
      await upsert('accounts', record);
      return record;
    },

    updateAccount: async (id, patch) => {
      const existing = find('accounts', id);
      if (!existing) return;
      await upsert('accounts', {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
        syncStatus: nextSyncStatus(),
      });
    },

    deleteAccount: async (id) => {
      await drop('accounts', id);
    },

    createCategory: async (input) => {
      const record: Category = {
        ...input,
        id: uid(),
        userId: ownerId(),
        createdAt: Date.now(),
        syncStatus: nextSyncStatus(),
      };
      await upsert('categories', record);
      return record;
    },

    updateCategory: async (id, patch) => {
      const existing = find('categories', id);
      if (!existing) return;
      await upsert('categories', { ...existing, ...patch, syncStatus: nextSyncStatus() });
    },

    deleteCategory: async (id) => {
      await drop('categories', id);
    },

    createTransaction: async (input) => {
      const now = Date.now();
      const record: Transaction = {
        ...input,
        id: uid(),
        userId: ownerId(),
        createdAt: now,
        updatedAt: now,
        syncStatus: nextSyncStatus(),
      };
      await upsert('transactions', record);
      return record;
    },

    updateTransaction: async (id, patch) => {
      const existing = find('transactions', id);
      if (!existing) return;
      await upsert('transactions', {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
        syncStatus: nextSyncStatus(),
      });
    },

    deleteTransaction: async (id) => {
      await drop('transactions', id);
    },

    createInvestment: async (input) => {
      const now = Date.now();
      const record: Investment = {
        ...input,
        id: uid(),
        userId: ownerId(),
        createdAt: now,
        updatedAt: now,
        syncStatus: nextSyncStatus(),
      };
      await upsert('investments', record);
      if (record.currentValue > 0) {
        await upsert('snapshots', {
          id: uid(),
          investmentId: record.id,
          value: record.currentValue,
          date: now,
          createdAt: now,
          syncStatus: nextSyncStatus(),
        });
      }
      return record;
    },

    updateInvestment: async (id, patch) => {
      const existing = find('investments', id);
      if (!existing) return;
      await upsert('investments', {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
        syncStatus: nextSyncStatus(),
      });
    },

    deleteInvestment: async (id) => {
      await drop('investments', id);
      const related = get().snapshots.filter((snap) => snap.investmentId === id);
      for (const snap of related) {
        await drop('snapshots', snap.id);
      }
    },

    updateInvestmentValue: async (id, value, date = Date.now()) => {
      const existing = find('investments', id);
      if (!existing) return;
      await upsert('investments', {
        ...existing,
        currentValue: value,
        updatedAt: date,
        syncStatus: nextSyncStatus(),
      });
      const snapshot: InvestmentValueSnapshot = {
        id: uid(),
        investmentId: id,
        value,
        date,
        createdAt: Date.now(),
        syncStatus: nextSyncStatus(),
      };
      await upsert('snapshots', snapshot);
    },

    createScheduledExpense: async (input) => {
      const now = Date.now();
      const record: ScheduledExpense = {
        ...input,
        id: uid(),
        userId: ownerId(),
        createdAt: now,
        updatedAt: now,
        syncStatus: nextSyncStatus(),
      };
      await upsert('scheduledExpenses', record);
      return record;
    },

    updateScheduledExpense: async (id, patch) => {
      const existing = find('scheduledExpenses', id);
      if (!existing) return;
      await upsert('scheduledExpenses', {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
        syncStatus: nextSyncStatus(),
      });
    },

    deleteScheduledExpense: async (id) => {
      await drop('scheduledExpenses', id);
    },

    markScheduledExpensePaid: async (id, accountId, date = Date.now()) => {
      const existing = find('scheduledExpenses', id);
      if (!existing || existing.status === 'paid') return;

      const transaction = await get().createTransaction({
        type: 'expense',
        amount: existing.amount,
        accountId,
        toAccountId: null,
        investmentId: null,
        categoryId: existing.categoryId,
        description: existing.name,
        date,
        notes: existing.notes,
      });

      await upsert('scheduledExpenses', {
        ...existing,
        status: 'paid',
        linkedTransactionId: transaction.id,
        updatedAt: Date.now(),
        syncStatus: nextSyncStatus(),
      });
    },

    createGoal: async (input) => {
      const now = Date.now();
      const record: Goal = {
        ...input,
        id: uid(),
        userId: ownerId(),
        createdAt: now,
        updatedAt: now,
        syncStatus: nextSyncStatus(),
      };
      await upsert('goals', record);
      return record;
    },

    updateGoal: async (id, patch) => {
      const existing = find('goals', id);
      if (!existing) return;
      await upsert('goals', {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
        syncStatus: nextSyncStatus(),
      });
    },

    deleteGoal: async (id) => {
      await drop('goals', id);
      const related = get().goalAllocations.filter((alloc) => alloc.goalId === id);
      for (const alloc of related) {
        await drop('goalAllocations', alloc.id);
      }
    },

    createGoalAllocation: async (input) => {
      const record: GoalAllocation = {
        ...input,
        id: uid(),
        createdAt: Date.now(),
        syncStatus: nextSyncStatus(),
      };
      await upsert('goalAllocations', record);
      return record;
    },

    deleteGoalAllocation: async (id) => {
      await drop('goalAllocations', id);
    },
  };
});
