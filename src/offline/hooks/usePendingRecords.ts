import { useEffect, useState } from 'react';

import { getQueueItemsByEntity } from '../queue/syncQueue';
import { subscribeOfflineEvent } from '../services/offline-events';
import type { PendingOperation } from '../models/pending-operation';

export function usePendingRecords(entity?: string) {
  const [records, setRecords] = useState<PendingOperation[]>([]);

  useEffect(() => {
    const load = async () => {
      if (entity) {
        const items = await getQueueItemsByEntity(entity);
        setRecords(items.filter((item) => item.status !== 'SUCCESS'));
        return;
      }

      const { getPendingOperations } = await import('../queue/syncQueue');
      setRecords(await getPendingOperations());
    };

    void load();

    const unsub = subscribeOfflineEvent('queueChanged', () => void load());
    return unsub;
  }, [entity]);

  return records;
}
