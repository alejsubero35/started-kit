import { useContext } from 'react';

import { OfflineContext } from '../providers/OfflineProvider';

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline debe usarse dentro de OfflineProvider');
  }

  return {
    isOnline: context.isOnline,
    isOffline: !context.isOnline,
    isSyncing: context.syncMeta.isSyncing,
    lastSync: context.syncMeta.lastSyncAt,
    pendingOperations: context.pendingOperations,
    startSync: context.startSync,
    refresh: context.refresh,
  };
}
