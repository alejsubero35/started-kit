import { useEffect, useState } from 'react';

import { getSyncMetadata } from '../services/cache.service';
import { subscribeOfflineEvent } from '../services/offline-events';
import type { SyncMetadata } from '../models/sync-status';

export function useSyncStatus() {
  const [meta, setMeta] = useState<SyncMetadata>({
    lastSyncAt: null,
    lastSyncError: null,
    isSyncing: false,
  });

  useEffect(() => {
    const load = async () => setMeta(await getSyncMetadata());
    void load();

    const unsubscribers = [
      subscribeOfflineEvent('syncStarted', () => void load()),
      subscribeOfflineEvent('syncCompleted', () => void load()),
      subscribeOfflineEvent('syncFailed', () => void load()),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  return meta;
}
