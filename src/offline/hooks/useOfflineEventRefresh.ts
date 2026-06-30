import { useEffect } from 'react';

import { subscribeOfflineEvent } from '../services/offline-events';

export function useOfflineEventRefresh(refresh: () => Promise<void>) {
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void refresh();
      }, 80);
    };

    const unsubscribers = [
      subscribeOfflineEvent('queueChanged', scheduleRefresh),
      subscribeOfflineEvent('entityChanged', scheduleRefresh),
      subscribeOfflineEvent('syncStarted', () => void refresh()),
      subscribeOfflineEvent('syncCompleted', () => void refresh()),
      subscribeOfflineEvent('syncFailed', () => void refresh()),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [refresh]);
}
