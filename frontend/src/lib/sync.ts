import type { Snapshot } from './db';
import { getMeta, replaceCache, setMeta } from './db';
import { apiFetchWithETag } from './api';
import { API_URL, IS_DEMO } from './config';

// El ETag se guarda en IndexedDB (meta), no en localStorage: persiste entre
// sesiones y sobrevive limpiezas de storage del navegador, pero sigue siendo
// por dispositivo — cada navegador trackea qué versión de datos ya tiene.
const ETAG_META_KEY = 'finanzas.syncEtag';

export async function getStoredEtag(): Promise<string | null> {
  return (await getMeta<string>(ETAG_META_KEY)) ?? null;
}

async function storeEtag(etag: string | null): Promise<void> {
  if (etag) await setMeta(ETAG_META_KEY, etag);
}

export interface FetchResult {
  /** true si el servidor respondió 304 (el caché local seguía siendo válido). */
  notModified: boolean;
  /** Snapshot fresco cuando notModified=false; undefined cuando notModified=true. */
  snapshot?: Snapshot;
  error?: string;
}

/**
 * Re-fetch condicional desde el backend usando ETag.
 * - Envía el ETag guardado en If-None-Match.
 * - 304 → el caché local sigue siendo válido, no se transfiere nada.
 * - 200 → reemplaza por completo el caché IndexedDB y devuelve el snapshot.
 *
 * Las mutaciones (create/update/delete) NO pasan por acá: van directo a las
 * rutas REST. Esta función solo sincroniza cambios hechos en OTROS
 * navegadores (o al arrancar la app).
 */
export async function fetchAll(): Promise<FetchResult> {
  if (IS_DEMO || !API_URL) {
    return { notModified: true };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { notModified: true, error: 'Sin conexión' };
  }

  try {
    const etag = await getStoredEtag();
    const result = await apiFetchWithETag<Partial<Snapshot> & { _errors?: Record<string, string> }>(
      '/sync',
      { method: 'GET', etag },
    );

    if (result.notModified) {
      return { notModified: true };
    }

    const remote = result.data;
    const snapshot: Snapshot = {
      accounts: (remote.accounts as Snapshot['accounts']) ?? [],
      categories: (remote.categories as Snapshot['categories']) ?? [],
      transactions: (remote.transactions as Snapshot['transactions']) ?? [],
      investments: (remote.investments as Snapshot['investments']) ?? [],
      snapshots: (remote.snapshots as Snapshot['snapshots']) ?? [],
      scheduledExpenses: (remote.scheduledExpenses as Snapshot['scheduledExpenses']) ?? [],
      goals: (remote.goals as Snapshot['goals']) ?? [],
      goalAllocations: (remote.goalAllocations as Snapshot['goalAllocations']) ?? [],
    };

    await replaceCache(snapshot);
    await storeEtag(result.etag);

    const pullErrors = remote._errors;
    if (pullErrors && Object.keys(pullErrors).length) {
      const detail = Object.entries(pullErrors)
        .map(([store, msg]) => `${store}: ${msg}`)
        .join(' | ');
      return { notModified: false, snapshot, error: `Sync parcial: ${detail}` };
    }

    return { notModified: false, snapshot };
  } catch (error) {
    return {
      notModified: true,
      error: error instanceof Error ? error.message : 'Error de sincronización',
    };
  }
}

/**
 * Registra listeners para refrescar datos cuando:
 * - vuelve la conexión (evento online)
 * - la pestaña vuelve a ser visible (visibilitychange)
 * - cada 5 minutos (interval)
 *
 * Reutilizado por SyncIndicator para disparar el re-fetch condicional.
 */
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
