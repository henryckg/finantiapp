import type { Snapshot } from './db';
import { loadSnapshot, putMany } from './db';
import { apiFetch } from './api';
import { API_URL, IS_DEMO } from './config';

const SYNC_META_KEY = 'finanzas.lastSyncAt';

export function getLastSyncAt(): number | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SYNC_META_KEY);
  return raw ? Number(raw) : null;
}

function setLastSyncAt(value: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SYNC_META_KEY, String(value));
}

export function pendingCount(snapshot: Snapshot): number {
  return Object.values(snapshot)
    .flat()
    .filter((record) => (record as { syncStatus?: string }).syncStatus === 'pending').length;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  skipped: boolean;
  error?: string;
}

export async function syncNow(): Promise<SyncResult> {
  if (IS_DEMO || !API_URL) {
    return { pushed: 0, pulled: 0, skipped: true };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { pushed: 0, pulled: 0, skipped: true, error: 'Sin conexión' };
  }

  const snapshot = await loadSnapshot();
  const pending = {
    accounts: snapshot.accounts.filter((r) => r.syncStatus === 'pending'),
    categories: snapshot.categories.filter((r) => r.syncStatus === 'pending'),
    transactions: snapshot.transactions.filter((r) => r.syncStatus === 'pending'),
    investments: snapshot.investments.filter((r) => r.syncStatus === 'pending'),
    snapshots: snapshot.snapshots.filter((r) => r.syncStatus === 'pending'),
    scheduledExpenses: snapshot.scheduledExpenses.filter((r) => r.syncStatus === 'pending'),
    goals: snapshot.goals.filter((r) => r.syncStatus === 'pending'),
    goalAllocations: snapshot.goalAllocations.filter((r) => r.syncStatus === 'pending'),
  };

  const pushedCount = Object.values(pending).reduce((sum, list) => sum + list.length, 0);

  try {
    if (pushedCount > 0) {
      await apiFetch('/sync/push', { method: 'POST', body: pending });
      await Promise.all(
        Object.entries(pending).map(([store, records]) =>
          records.length
            ? putMany(
                store as keyof typeof pending,
                records.map((record) => ({ ...record, syncStatus: 'synced' as const })) as never,
              )
            : Promise.resolve(),
        ),
      );
    }

    const since = getLastSyncAt() ?? 0;
    const remote = await apiFetch<Partial<Snapshot>>(`/sync?since=${since}`);

    let pulled = 0;
    for (const [store, records] of Object.entries(remote)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      pulled += records.length;
      await putMany(store as keyof Snapshot, records as never);
    }

    setLastSyncAt(Date.now());
    return { pushed: pushedCount, pulled, skipped: false };
  } catch (error) {
    return {
      pushed: 0,
      pulled: 0,
      skipped: false,
      error: error instanceof Error ? error.message : 'Error de sincronización',
    };
  }
}

export function registerSyncListeners(onSync: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onSync();
  window.addEventListener('online', handler);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') handler();
  });
  const interval = window.setInterval(handler, 5 * 60 * 1000);
  return () => {
    window.removeEventListener('online', handler);
    window.clearInterval(interval);
  };
}
