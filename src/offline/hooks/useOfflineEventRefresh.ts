import { useEffect } from 'react';

import { subscribeOfflineEvent } from '../services/offline-events';

export function useOfflineEventRefresh(refresh: () => Promise<void>) {
  useEffect(() => {
    const unsubscribers = [
      subscribeOfflineEvent('syncStarted', () => void refresh()),
      subscribeOfflineEvent('syncCompleted', () => void refresh()),
      subscribeOfflineEvent('syncFailed', () => void refresh()),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [refresh]);
}
