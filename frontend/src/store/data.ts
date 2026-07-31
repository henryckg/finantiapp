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
import { fetchAll } from '../lib/sync';
import { apiFetch } from '../lib/api';
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

interface DataState extends Snapshot {
  ready: boolean;
  loading: boolean;
  error: string | null;
  syncing: boolean;
  syncQueued: boolean;
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

  // Escribe en el caché IndexedDB + actualiza el estado de Zustand.
  // NO llama a sync(): las mutaciones ya fueron al servidor via REST.
  async function cacheUpsert<K extends StoreName>(store: K, record: Snapshot[K][number]) {
    await persist(store, record);
    const current = get()[store] as { id: string }[];
    const exists = current.some((item) => item.id === record.id);
    const next = exists
      ? current.map((item) => (item.id === record.id ? record : item))
      : [...current, record];
    replaceInState(store, next as Snapshot[K]);
  }

  // Borra del caché IndexedDB + actualiza el estado de Zustand.
  async function cacheDrop<K extends StoreName>(store: K, id: string) {
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
    syncQueued: false,
    lastSyncError: null,

    load: async () => {
      set({ loading: true, error: null });
      try {
        if (IS_DEMO) {
          await seedDemoIfNeeded();
        }
        // Render inmediato desde el caché IndexedDB (apertura instantánea).
        const snapshot = await loadSnapshot();
        set({ ...snapshot, ready: true, loading: false });
        // Reconciliar con el backend en segundo plano (ETag condicional).
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
      if (get().syncing) {
        set({ syncQueued: true });
        return;
      }
      set({ syncing: true, syncQueued: false });
      const result = await fetchAll();
      // Si el servidor devolvió datos frescos (200, no 304), reemplazar el
      // estado con el snapshot completo. Esto detecta borrados hechos en
      // otros navegadores que el caché local no tenía.
      if (!result.notModified && result.snapshot) {
        set({ ...result.snapshot });
      }
      set({ syncing: false, lastSyncError: result.error ?? null });
      if (get().syncQueued) {
        void get().sync();
      }
    },

    resetDemoData: async () => {
      await resetDemo();
      await get().refresh();
    },

    createAccount: async (input) => {
      if (IS_DEMO) {
        const now = Date.now();
        const record: Account = {
          ...input,
          id: uid(),
          userId: ownerId(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'synced',
        };
        await cacheUpsert('accounts', record);
        return record;
      }
      const created = await apiFetch<Account>('/accounts', { method: 'POST', body: input });
      const record: Account = { ...created, syncStatus: 'synced' };
      await cacheUpsert('accounts', record);
      return record;
    },

    updateAccount: async (id, patch) => {
      const existing = find('accounts', id);
      if (!existing) return;
      if (IS_DEMO) {
        await cacheUpsert('accounts', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
        return;
      }
      await apiFetch(`/accounts/${id}`, { method: 'PUT', body: patch });
      await cacheUpsert('accounts', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
    },

    deleteAccount: async (id) => {
      if (!IS_DEMO) {
        await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
      }
      await cacheDrop('accounts', id);
    },

    createCategory: async (input) => {
      if (IS_DEMO) {
        const record: Category = {
          ...input,
          id: uid(),
          userId: ownerId(),
          createdAt: Date.now(),
          syncStatus: 'synced',
        };
        await cacheUpsert('categories', record);
        return record;
      }
      const created = await apiFetch<Category>('/categories', { method: 'POST', body: input });
      const record: Category = { ...created, syncStatus: 'synced' };
      await cacheUpsert('categories', record);
      return record;
    },

    updateCategory: async (id, patch) => {
      const existing = find('categories', id);
      if (!existing) return;
      if (IS_DEMO) {
        await cacheUpsert('categories', { ...existing, ...patch, syncStatus: 'synced' });
        return;
      }
      await apiFetch(`/categories/${id}`, { method: 'PUT', body: patch });
      await cacheUpsert('categories', { ...existing, ...patch, syncStatus: 'synced' });
    },

    deleteCategory: async (id) => {
      if (!IS_DEMO) {
        await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      }
      await cacheDrop('categories', id);
    },

    createTransaction: async (input) => {
      if (IS_DEMO) {
        const now = Date.now();
        const record: Transaction = {
          ...input,
          id: uid(),
          userId: ownerId(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'synced',
        };
        await cacheUpsert('transactions', record);
        return record;
      }
      const created = await apiFetch<Transaction>('/transactions', { method: 'POST', body: input });
      const record: Transaction = { ...created, syncStatus: 'synced' };
      await cacheUpsert('transactions', record);
      return record;
    },

    updateTransaction: async (id, patch) => {
      const existing = find('transactions', id);
      if (!existing) return;
      if (IS_DEMO) {
        await cacheUpsert('transactions', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
        return;
      }
      await apiFetch(`/transactions/${id}`, { method: 'PUT', body: patch });
      await cacheUpsert('transactions', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
    },

    deleteTransaction: async (id) => {
      if (!IS_DEMO) {
        await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      }
      await cacheDrop('transactions', id);
    },

    createInvestment: async (input) => {
      if (IS_DEMO) {
        const now = Date.now();
        const record: Investment = {
          ...input,
          id: uid(),
          userId: ownerId(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'synced',
        };
        await cacheUpsert('investments', record);
        if (record.currentValue > 0) {
          await cacheUpsert('snapshots', {
            id: uid(),
            investmentId: record.id,
            value: record.currentValue,
            date: now,
            createdAt: now,
            syncStatus: 'synced',
          });
        }
        return record;
      }
      const created = await apiFetch<Investment>('/investments', { method: 'POST', body: input });
      const record: Investment = { ...created, syncStatus: 'synced' };
      await cacheUpsert('investments', record);
      // El backend POST /investments no crea snapshot inicial; lo hacemos con
      // update-value si hay un currentValue > 0.
      if (record.currentValue > 0) {
        const res = await apiFetch<{ ok: boolean; snapshotId: string }>(
          `/investments/${record.id}/update-value`,
          { method: 'POST', body: { value: record.currentValue, date: record.createdAt } },
        );
        const snapshot: InvestmentValueSnapshot = {
          id: res.snapshotId,
          investmentId: record.id,
          value: record.currentValue,
          date: record.createdAt,
          createdAt: record.createdAt,
          syncStatus: 'synced',
        };
        await cacheUpsert('snapshots', snapshot);
      }
      return record;
    },

    updateInvestment: async (id, patch) => {
      const existing = find('investments', id);
      if (!existing) return;
      if (IS_DEMO) {
        await cacheUpsert('investments', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
        return;
      }
      await apiFetch(`/investments/${id}`, { method: 'PUT', body: patch });
      await cacheUpsert('investments', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
    },

    deleteInvestment: async (id) => {
      if (!IS_DEMO) {
        // El backend DELETE /investments/:id borra también los snapshots.
        await apiFetch(`/investments/${id}`, { method: 'DELETE' });
      }
      await cacheDrop('investments', id);
      const related = get().snapshots.filter((snap) => snap.investmentId === id);
      for (const snap of related) {
        await cacheDrop('snapshots', snap.id);
      }
    },

    updateInvestmentValue: async (id, value, date = Date.now()) => {
      const existing = find('investments', id);
      if (!existing) return;
      if (IS_DEMO) {
        await cacheUpsert('investments', { ...existing, currentValue: value, updatedAt: date, syncStatus: 'synced' });
        const snapshot: InvestmentValueSnapshot = {
          id: uid(),
          investmentId: id,
          value,
          date,
          createdAt: Date.now(),
          syncStatus: 'synced',
        };
        await cacheUpsert('snapshots', snapshot);
        return;
      }
      const res = await apiFetch<{ ok: boolean; snapshotId: string }>(
        `/investments/${id}/update-value`,
        { method: 'POST', body: { value, date } },
      );
      await cacheUpsert('investments', { ...existing, currentValue: value, updatedAt: date, syncStatus: 'synced' });
      const snapshot: InvestmentValueSnapshot = {
        id: res.snapshotId,
        investmentId: id,
        value,
        date,
        createdAt: Date.now(),
        syncStatus: 'synced',
      };
      await cacheUpsert('snapshots', snapshot);
    },

    createScheduledExpense: async (input) => {
      if (IS_DEMO) {
        const now = Date.now();
        const record: ScheduledExpense = {
          ...input,
          id: uid(),
          userId: ownerId(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'synced',
        };
        await cacheUpsert('scheduledExpenses', record);
        return record;
      }
      const created = await apiFetch<ScheduledExpense>('/scheduled-expenses', {
        method: 'POST',
        body: input,
      });
      const record: ScheduledExpense = { ...created, syncStatus: 'synced' };
      await cacheUpsert('scheduledExpenses', record);
      return record;
    },

    updateScheduledExpense: async (id, patch) => {
      const existing = find('scheduledExpenses', id);
      if (!existing) return;
      if (IS_DEMO) {
        await cacheUpsert('scheduledExpenses', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
        return;
      }
      await apiFetch(`/scheduled-expenses/${id}`, { method: 'PUT', body: patch });
      await cacheUpsert('scheduledExpenses', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
    },

    deleteScheduledExpense: async (id) => {
      if (!IS_DEMO) {
        await apiFetch(`/scheduled-expenses/${id}`, { method: 'DELETE' });
      }
      await cacheDrop('scheduledExpenses', id);
    },

    markScheduledExpensePaid: async (id, accountId, date = Date.now()) => {
      const existing = find('scheduledExpenses', id);
      if (!existing || existing.status === 'paid') return;

      if (IS_DEMO) {
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
        await cacheUpsert('scheduledExpenses', {
          ...existing,
          status: 'paid',
          linkedTransactionId: transaction.id,
          updatedAt: Date.now(),
          syncStatus: 'synced',
        });
        return;
      }

      // El backend mark-paid crea la transacción y actualiza el gasto
      // programado en una sola operación atómica del lado del servidor.
      const res = await apiFetch<{ ok: boolean; transactionId: string }>(
        `/scheduled-expenses/${id}/mark-paid`,
        { method: 'POST', body: { accountId, date } },
      );
      const now = Date.now();
      const transaction: Transaction = {
        id: res.transactionId,
        userId: ownerId(),
        type: 'expense',
        amount: existing.amount,
        accountId,
        toAccountId: null,
        investmentId: null,
        categoryId: existing.categoryId,
        description: existing.name,
        date,
        notes: existing.notes,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'synced',
      };
      await cacheUpsert('transactions', transaction);
      await cacheUpsert('scheduledExpenses', {
        ...existing,
        status: 'paid',
        linkedTransactionId: res.transactionId,
        updatedAt: now,
        syncStatus: 'synced',
      });
    },

    createGoal: async (input) => {
      if (IS_DEMO) {
        const now = Date.now();
        const record: Goal = {
          ...input,
          id: uid(),
          userId: ownerId(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'synced',
        };
        await cacheUpsert('goals', record);
        return record;
      }
      const created = await apiFetch<Goal>('/goals', { method: 'POST', body: input });
      const record: Goal = { ...created, syncStatus: 'synced' };
      await cacheUpsert('goals', record);
      return record;
    },

    updateGoal: async (id, patch) => {
      const existing = find('goals', id);
      if (!existing) return;
      if (IS_DEMO) {
        await cacheUpsert('goals', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
        return;
      }
      await apiFetch(`/goals/${id}`, { method: 'PUT', body: patch });
      await cacheUpsert('goals', { ...existing, ...patch, updatedAt: Date.now(), syncStatus: 'synced' });
    },

    deleteGoal: async (id) => {
      if (!IS_DEMO) {
        // El backend DELETE /goals/:id borra también las asignaciones.
        await apiFetch(`/goals/${id}`, { method: 'DELETE' });
      }
      await cacheDrop('goals', id);
      const related = get().goalAllocations.filter((alloc) => alloc.goalId === id);
      for (const alloc of related) {
        await cacheDrop('goalAllocations', alloc.id);
      }
    },

    createGoalAllocation: async (input) => {
      if (IS_DEMO) {
        const record: GoalAllocation = {
          ...input,
          id: uid(),
          createdAt: Date.now(),
          syncStatus: 'synced',
        };
        await cacheUpsert('goalAllocations', record);
        return record;
      }
      const created = await apiFetch<GoalAllocation>(
        `/goals/${input.goalId}/allocations`,
        { method: 'POST', body: input },
      );
      const record: GoalAllocation = { ...created, syncStatus: 'synced' };
      await cacheUpsert('goalAllocations', record);
      return record;
    },

    deleteGoalAllocation: async (id) => {
      if (!IS_DEMO) {
        // Necesitamos el goalId para la ruta anidada.
        const alloc = find('goalAllocations', id);
        if (alloc) {
          await apiFetch(`/goals/${alloc.goalId}/allocations/${id}`, { method: 'DELETE' });
        }
      }
      await cacheDrop('goalAllocations', id);
    },
  };
});
