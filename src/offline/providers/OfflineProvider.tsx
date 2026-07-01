import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  initNetworkService,
  initSyncListeners,
  processSyncQueue,
  registerEntityAdapter,
} from '../services/sync.service';
import { getPendingCount } from '../queue/syncQueue';
import { getSyncMetadata, setSyncMetadata } from '../services/cache.service';
import { emitOfflineEvent } from '../services/offline-events';
import { useOfflineEventRefresh } from '../hooks/useOfflineEventRefresh';
import { userEntityAdapter } from '@/features/users/adapters/user.adapter';
import { getNnaOfflinePendingCount, nnaService } from '@/services/nna.service';
import { prefetchReferenceData } from '../services/referenceDataCache';
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

async function getTotalPendingCount(): Promise<number> {
  const idbCount = await getPendingCount();
  return idbCount + getNnaOfflinePendingCount();
}

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
  const isSyncingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshState = useCallback(async () => {
    const [totalPending, meta] = await Promise.all([getTotalPendingCount(), getSyncMetadata()]);
    setPendingOperations(totalPending);
    setSyncMeta(meta);
  }, []);

  useOfflineEventRefresh(refreshState);

  const startSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (isSyncingRef.current) return;

    const pendingCount = await getTotalPendingCount();
    if (pendingCount === 0) return;

    isSyncingRef.current = true;

    try {
      await setSyncMetadata({ isSyncing: true, lastSyncError: null });
      setSyncMeta((prev) => ({ ...prev, isSyncing: true, lastSyncError: null }));
      emitOfflineEvent('syncStarted', { total: pendingCount });
      emitOfflineEvent('syncProgress', { current: 0, total: pendingCount });

      const { synced: idbSynced, failed: idbFailed } = await processSyncQueue({
        manageLifecycle: false,
      });

      let nnaSynced = 0;
      let nnaFailed = 0;
      const nnaPendingBefore = getNnaOfflinePendingCount();

      if (nnaPendingBefore > 0) {
        try {
          nnaSynced = await nnaService.flushOfflineQueue();
        } catch {
          nnaFailed = getNnaOfflinePendingCount() || nnaPendingBefore;
        }
      }

      const synced = idbSynced + nnaSynced;
      const failed = idbFailed + nnaFailed;
      const progressCurrent = Math.min(pendingCount, synced + failed);

      emitOfflineEvent('syncProgress', { current: progressCurrent, total: pendingCount });

      const nextMeta: SyncMetadata = {
        isSyncing: false,
        lastSyncAt: synced > 0 ? new Date().toISOString() : (await getSyncMetadata()).lastSyncAt,
        lastSyncError: failed > 0 ? `${failed} operación(es) fallida(s)` : null,
      };

      await setSyncMetadata(nextMeta);
      setSyncMeta(nextMeta);
      emitOfflineEvent('syncCompleted', { synced, failed });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado';
      const failedMeta: SyncMetadata = {
        isSyncing: false,
        lastSyncAt: (await getSyncMetadata()).lastSyncAt,
        lastSyncError: message,
      };
      await setSyncMetadata(failedMeta);
      setSyncMeta(failedMeta);
      emitOfflineEvent('syncFailed', { error: message });
    } finally {
      isSyncingRef.current = false;
      await refreshState();
    }
  }, [refreshState]);

  const scheduleAutoSync = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      void startSync();
    }, 400);
  }, [startSync]);

  useEffect(() => {
    REGISTERED_ADAPTERS.forEach(registerEntityAdapter);

    const cleanupNetwork = initNetworkService();
    const cleanupSync = initSyncListeners();

    const handleOnline = () => {
      setIsOnline(true);
      void prefetchReferenceData();
      scheduleAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void (async () => {
      const meta = await getSyncMetadata();
      if (meta.isSyncing) {
        await setSyncMetadata({ isSyncing: false });
      }
      await refreshState();
      void prefetchReferenceData();

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const pending = await getTotalPendingCount();
        if (pending > 0) {
          scheduleAutoSync();
        }
      }
    })();

    return () => {
      cleanupNetwork();
      cleanupSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [refreshState, scheduleAutoSync]);

  const value = useMemo(
    () => ({ isOnline, pendingOperations, syncMeta, startSync, refresh: refreshState }),
    [isOnline, pendingOperations, syncMeta, startSync, refreshState],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
