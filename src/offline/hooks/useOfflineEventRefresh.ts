import { useEffect } from 'react';

import { NNA_OFFLINE_QUEUE_CHANGED } from '@/services/nna.service';
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

    window.addEventListener(NNA_OFFLINE_QUEUE_CHANGED, scheduleRefresh);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      window.removeEventListener(NNA_OFFLINE_QUEUE_CHANGED, scheduleRefresh);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [refresh]);
}
