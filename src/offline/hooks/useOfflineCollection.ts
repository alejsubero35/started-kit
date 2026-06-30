import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
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
    staleTime: Infinity,
    notifyOnChangeProps: ['data', 'error'],
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
    adapter.queryKeys.forEach((keys) => {
      void queryClient.invalidateQueries({ queryKey: keys });
    });
  }, [adapter.queryKeys, queryClient, queryKey]);

  const reloadLocalData = useCallback(async () => {
    const data = await getOfflineRecords<T>(entity);
    queryClient.setQueryData(queryKey, data);
  }, [entity, queryClient, queryKey]);

  useEffect(() => {
    const unsubscribers = [
      subscribeOfflineEvent('entityChanged', (detail) => {
        if (!detail?.entity || detail.entity === entity) {
          void getSyncMetadata().then((meta) => {
            if (!meta.isSyncing) {
              invalidate();
            }
          });
          void refreshPendingCount();
        }
      }),
      subscribeOfflineEvent('syncCompleted', () => {
        startTransition(() => {
          void reloadLocalData();
          void refreshPendingCount();
        });
      }),
      subscribeOfflineEvent('queueChanged', () => {
        void getSyncMetadata().then((meta) => {
          if (!meta.isSyncing) {
            void refreshPendingCount();
          }
        });
      }),
    ];

    void refreshPendingCount();
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [entity, invalidate, refreshPendingCount, reloadLocalData]);

  const create = useCallback(
    async (data: Omit<T, 'id' | '_localId' | '_syncStatus' | '_syncError'>) => {
      const localId = crypto.randomUUID();
      const draft = {
        ...data,
        id: localId,
        _localId: localId,
        _syncStatus: 'pending' as const,
      } as T;

      await createOfflineRecord({
        entity,
        data: draft,
        localId,
      });

      invalidate();
      void refreshPendingCount();

      if (navigator.onLine) {
        await processSyncQueue();
      }

      return draft;
    },
    [entity, invalidate, refreshPendingCount],
  );

  const items = useMemo(() => query.data ?? [], [query.data]);

  return {
    items,
    isLoading: query.isLoading,
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
