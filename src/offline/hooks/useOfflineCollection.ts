import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { EntitySyncAdapter } from '@/offline/models/entity-adapter';
import type { RecordSyncStatus } from '@/offline/models/sync-status';
import {
  createOfflineRecord,
  getOfflineRecords,
  processSyncQueue,
  seedOfflineRecords,
} from '@/offline/services/offline.service';
import { subscribeOfflineEvent } from '@/offline/services/offline-events';
import { getPendingCount } from '@/offline/queue/syncQueue';
import { getSyncMetadata } from '@/offline/services/cache.service';
import { isBrowserOnline } from '@/offline/services/network.service';

export type OfflineRecordBase = {
  id: number | string;
  _localId?: string;
  _syncStatus?: RecordSyncStatus;
  _syncError?: string;
};

export type UseOfflineCollectionOptions<T extends OfflineRecordBase> = {
  entity: string;
  adapter: EntitySyncAdapter<T>;
  queryKey: string[];
  seedData?: T[];
  getLocalId: (record: T) => string;
};

export function useOfflineCollection<T extends OfflineRecordBase>({
  entity,
  adapter,
  queryKey,
  seedData,
  getLocalId,
}: UseOfflineCollectionOptions<T>) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const hasHydratedRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (seedData?.length) {
        await seedOfflineRecords(entity, seedData, getLocalId);
      }
      return getOfflineRecords<T>(entity);
    },
    placeholderData: () => seedData ?? [],
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.isSuccess) {
      hasHydratedRef.current = true;
    }
  }, [query.isSuccess]);

  const reloadLocalData = useCallback(async () => {
    const data = await getOfflineRecords<T>(entity);
    queryClient.setQueryData(queryKey, data);
  }, [entity, queryClient, queryKey]);

  useEffect(() => {
    const unsubscribers = [
      subscribeOfflineEvent('entityChanged', (detail) => {
        if (!detail?.entity || detail.entity === entity) {
          void getSyncMetadata().then((meta) => {
            if (!meta.isSyncing && hasHydratedRef.current) {
              void reloadLocalData();
            }
          });
          void refreshPendingCount();
        }
      }),
      subscribeOfflineEvent('syncCompleted', () => {
        if (!hasHydratedRef.current) return;

        startTransition(() => {
          void reloadLocalData();
          void refreshPendingCount();
        });
      }),
      subscribeOfflineEvent('queueChanged', () => {
        void refreshPendingCount();
      }),
    ];

    void refreshPendingCount();
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [entity, refreshPendingCount, reloadLocalData]);

  const create = useCallback(
    async (data: Omit<T, 'id' | '_localId' | '_syncStatus' | '_syncError'>) => {
      const localId = crypto.randomUUID();
      const draft = {
        ...data,
        id: localId,
        _localId: localId,
        _syncStatus: 'pending' as const,
      } as T;

      const { record } = await createOfflineRecord({
        entity,
        data: draft,
        localId,
      });

      queryClient.setQueryData<T[]>(queryKey, (current) => [...(current ?? []), record]);
      hasHydratedRef.current = true;
      void refreshPendingCount();

      if (isBrowserOnline()) {
        void processSyncQueue();
      }

      return record;
    },
    [entity, queryClient, queryKey, refreshPendingCount],
  );

  const items = useMemo(() => query.data ?? seedData ?? [], [query.data, seedData]);

  return {
    items,
    isLoading: query.isLoading && items.length === 0,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    create,
    pendingCount,
    startSync: async () => {
      await processSyncQueue();
    },
  };
}
