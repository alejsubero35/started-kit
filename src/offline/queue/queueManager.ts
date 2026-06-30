import type { EntitySyncAdapter } from '../models/entity-adapter';
import type { OperationType } from '../models/operation-type';
import { GenericRepository } from '../database/repositories/generic.repository';
import {
  enqueueOperation,
  getPendingOperations,
  removeQueueItem,
  updateQueueItem,
} from './syncQueue';
import { DEFAULT_RETRY_POLICY, getBackoffDelayMs, shouldRetry, sleep } from './retryPolicy';
import { isBrowserOnline } from '../services/network.service';
import { setSyncMetadata } from '../services/cache.service';
import { emitOfflineEvent } from '../services/offline-events';

const adapters = new Map<string, EntitySyncAdapter>();

let isProcessing = false;

export function registerEntityAdapter(adapter: EntitySyncAdapter): void {
  adapters.set(adapter.entity, adapter);
}

export function getEntityAdapter(entity: string): EntitySyncAdapter | undefined {
  return adapters.get(entity);
}

export function generateLocalId(): string {
  return `local_${crypto.randomUUID()}`;
}

export async function createOfflineRecord<T extends Record<string, unknown>>(input: {
  entity: string;
  data: T;
  localId?: string;
}): Promise<{ localId: string; record: T }> {
  const localId = input.localId ?? generateLocalId();
  const repo = new GenericRepository<T>(input.entity);

  const recordWithMeta = {
    ...input.data,
    id: input.data.id ?? localId,
    _localId: localId,
    _syncStatus: 'pending' as const,
  } as T;

  await repo.upsert(localId, recordWithMeta, 'pending');
  await enqueueOperation({
    entity: input.entity,
    entityLocalId: localId,
    operation: 'CREATE',
    payload: recordWithMeta as Record<string, unknown>,
  });

  emitOfflineEvent('entityChanged', { entity: input.entity, localId });

  if (isBrowserOnline()) {
    void processSyncQueue();
  }

  return { localId, record: recordWithMeta };
}

export async function getOfflineRecords<T extends Record<string, unknown>>(
  entity: string,
): Promise<T[]> {
  const repo = new GenericRepository<T>(entity);
  const stored = await repo.getAll();
  return stored.map((item) => ({
    ...item.data,
    _localId: item.localId,
    _syncStatus: item.syncStatus,
    _syncError: item.error,
  })) as T[];
}

export async function seedOfflineRecords<T extends Record<string, unknown>>(
  entity: string,
  records: T[],
  getLocalId: (record: T) => string,
): Promise<void> {
  const repo = new GenericRepository<T>(entity);
  const existing = await repo.getAll();
  const existingIds = new Set(existing.map((item) => item.localId));

  for (const record of records) {
    const localId = getLocalId(record);
    if (existingIds.has(localId)) continue;

    await repo.upsert(localId, record, 'synced', record.id as string | number);
    existingIds.add(localId);
  }
}

async function processQueueItem(
  item: Awaited<ReturnType<typeof getPendingOperations>>[number],
): Promise<boolean> {
  const adapter = adapters.get(item.entity);
  if (!adapter) {
    console.warn(`[sync] No adapter registered for entity "${item.entity}"`);
    await updateQueueItem(item.id, {
      status: 'FAILED',
      error: `No adapter for entity: ${item.entity}`,
    });
    return false;
  }

  const repo = new GenericRepository(item.entity);

  await updateQueueItem(item.id, { status: 'SYNCING' });
  await repo.updateSyncStatus(item.entityLocalId, 'syncing');

  emitOfflineEvent('entityChanged', { entity: item.entity, localId: item.entityLocalId });

  try {
    const result = await adapter.push(item.operation, item.payload);

    const syncedData = {
      ...result.data,
      id: result.serverId,
      _localId: item.entityLocalId,
      _syncStatus: 'synced' as const,
    };

    await repo.upsert(item.entityLocalId, syncedData, 'synced', result.serverId);
    await removeQueueItem(item.id);
    emitOfflineEvent('entityChanged', { entity: item.entity, localId: item.entityLocalId });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de sincronización';
    const nextRetry = item.retryCount + 1;

    if (shouldRetry(nextRetry, DEFAULT_RETRY_POLICY)) {
      await updateQueueItem(item.id, {
        status: 'PENDING',
        retryCount: nextRetry,
        error: message,
      });
      await repo.updateSyncStatus(item.entityLocalId, 'pending', { error: message });
      await sleep(getBackoffDelayMs(nextRetry));
      return false;
    }

    await updateQueueItem(item.id, {
      status: 'FAILED',
      retryCount: nextRetry,
      error: message,
    });
    await repo.updateSyncStatus(item.entityLocalId, 'failed', { error: message });
    emitOfflineEvent('entityChanged', { entity: item.entity, localId: item.entityLocalId });
    return false;
  }
}

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (isProcessing) return { synced: 0, failed: 0 };
  if (!isBrowserOnline()) return { synced: 0, failed: 0 };

  isProcessing = true;
  await setSyncMetadata({ isSyncing: true, lastSyncError: null });

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingOperations();
    const total = pending.length;

    emitOfflineEvent('syncStarted', { total });
    emitOfflineEvent('syncProgress', { current: 0, total });

    for (let index = 0; index < pending.length; index++) {
      const item = pending[index];
      if (!isBrowserOnline()) break;

      emitOfflineEvent('syncProgress', { current: index, total });

      const ok = await processQueueItem(item);
      if (ok) synced += 1;
      else if (item.retryCount >= DEFAULT_RETRY_POLICY.maxRetries) failed += 1;

      emitOfflineEvent('syncProgress', { current: index + 1, total });
    }

    await setSyncMetadata({
      isSyncing: false,
      lastSyncAt: new Date().toISOString(),
      lastSyncError: failed > 0 ? `${failed} operación(es) fallida(s)` : null,
    });

    emitOfflineEvent('syncCompleted', { synced, failed });

    return { synced, failed };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    await setSyncMetadata({ isSyncing: false, lastSyncError: message });
    emitOfflineEvent('syncFailed', { error: message });
    return { synced, failed };
  } finally {
    isProcessing = false;
  }
}

export async function registerBackgroundSync(): Promise<void> {
  if (!isBrowserOnline()) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((_, reject) => {
        window.setTimeout(() => reject(new Error('service-worker-timeout')), 2_000);
      }),
    ]);
    const syncManager = (registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    }).sync;

    if (syncManager?.register) {
      await syncManager.register('offline-sync-queue');
    }
  } catch {
    // Background Sync no soportado en este navegador
  }
}

export function initSyncListeners(): () => void {
  const handleOnline = () => {
    emitOfflineEvent('online');
    void processSyncQueue();
  };

  const handleOffline = () => emitOfflineEvent('offline');

  const handleQueueChanged = () => {
    void registerBackgroundSync();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('offline:queueChanged', handleQueueChanged);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'offline:syncCompleted') {
        emitOfflineEvent('syncCompleted', event.data.detail);
      }
      if (event.data?.type === 'offline:triggerSync') {
        void processSyncQueue();
      }
    });
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('offline:queueChanged', handleQueueChanged);
  };
}

// Re-export for queue manager alias
export { processSyncQueue as syncQueue };
