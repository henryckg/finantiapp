import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, RotateCcw } from 'lucide-react';
import { IS_DEMO } from '../lib/config';
import { useDataStore } from '../store/data';
import { registerSyncListeners } from '../lib/sync';
import { cn } from '../lib/utils';

export default function SyncIndicator() {
  const syncing = useDataStore((state) => state.syncing);
  const lastSyncError = useDataStore((state) => state.lastSyncError);
  const sync = useDataStore((state) => state.sync);
  const resetDemoData = useDataStore((state) => state.resetDemoData);
  const [online, setOnline] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const unregister = IS_DEMO ? () => {} : registerSyncListeners(() => void sync());
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      unregister();
    };
  }, [sync]);

  if (IS_DEMO) {
    return (
      <button
        type="button"
        title="Reiniciar datos de demostración"
        aria-label="Reiniciar datos de demostración"
        onClick={async () => {
          setResetting(true);
          await resetDemoData();
          setResetting(false);
        }}
        className="text-text-secondary hover:text-text-primary rounded-md p-1.5 transition-colors hover:bg-white/5"
      >
        <RotateCcw className={cn('size-4', resetting && 'animate-spin')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      title={lastSyncError ?? (online ? 'Sincronizar ahora' : 'Sin conexión')}
      aria-label="Sincronizar"
      onClick={() => void sync()}
      className={cn(
        'rounded-md p-1.5 transition-colors hover:bg-white/5',
        lastSyncError ? 'text-negative' : 'text-text-secondary hover:text-text-primary',
      )}
    >
      {syncing ? (
        <RefreshCw className="size-4 animate-spin" />
      ) : online ? (
        <Cloud className="size-4" />
      ) : (
        <CloudOff className="size-4" />
      )}
    </button>
  );
}
