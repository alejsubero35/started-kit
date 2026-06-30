import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  initNetworkService,
  initSyncListeners,
  processSyncQueue,
  registerEntityAdapter,
} from '../services/sync.service';
import { getPendingCount } from '../queue/syncQueue';
import { getSyncMetadata, setSyncMetadata } from '../services/cache.service';
import { useOfflineEventRefresh } from '../hooks/useOfflineEventRefresh';
import { userEntityAdapter } from '@/features/users/adapters/user.adapter';
import type { SyncMetadata } from '../models/sync-status';

type OfflineContextValue = {
  isOnline: boolean;
  pendingOperations: number;
  syncMeta: SyncMetadata;
  startSync: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const OfflineContext = createContext<OfflineContextValue | null>(null);

const REGISTERED_ADAPTERS = [userEntityAdapter];

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine,
  );
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata>({
    lastSyncAt: null,
    lastSyncError: null,
    isSyncing: false,
  });

  const refreshState = useCallback(async () => {
    const [count, meta] = await Promise.all([getPendingCount(), getSyncMetadata()]);
    setPendingOperations(count);
    setSyncMeta(meta);
  }, []);

  useOfflineEventRefresh(refreshState);

  const startSync = useCallback(async () => {
    await processSyncQueue();
  }, []);

  useEffect(() => {
    REGISTERED_ADAPTERS.forEach(registerEntityAdapter);

    const cleanupNetwork = initNetworkService();
    const cleanupSync = initSyncListeners();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void (async () => {
      const meta = await getSyncMetadata();
      if (meta.isSyncing) {
        await setSyncMetadata({ isSyncing: false });
      }
      await refreshState();
    })();

    return () => {
      cleanupNetwork();
      cleanupSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshState]);

  const value = useMemo(
    () => ({ isOnline, pendingOperations, syncMeta, startSync, refresh: refreshState }),
    [isOnline, pendingOperations, syncMeta, startSync, refreshState],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
