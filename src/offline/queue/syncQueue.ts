import { getOfflineDB } from '../database/indexeddb';
import { STORES } from '../database/migrations';
import type { PendingOperation } from '../models/pending-operation';
import type { OperationType } from '../models/operation-type';
import type { QueueItemStatus } from '../models/sync-status';
import { emitOfflineEvent } from '../services/offline-events';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOperation(input: {
  entity: string;
  entityLocalId: string;
  operation: OperationType;
  payload: Record<string, unknown>;
}): Promise<PendingOperation> {
  const db = await getOfflineDB();
  const now = new Date().toISOString();

  const item: PendingOperation = {
    id: generateId(),
    entity: input.entity,
    entityLocalId: input.entityLocalId,
    operation: input.operation,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    status: 'PENDING',
  };

  await db.put(STORES.syncQueue, item);
  emitOfflineEvent('queueChanged', { entity: input.entity });
  return item;
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await getOfflineDB();
  const all = await db.getAll(STORES.syncQueue);
  return all
    .filter((item) => item.status === 'PENDING' || item.status === 'FAILED')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAllQueueItems(): Promise<PendingOperation[]> {
  const db = await getOfflineDB();
  return db.getAll(STORES.syncQueue);
}

export async function getPendingCount(): Promise<number> {
  const items = await getPendingOperations();
  return items.length;
}

export async function updateQueueItem(
  id: string,
  patch: Partial<Pick<PendingOperation, 'status' | 'retryCount' | 'error' | 'updatedAt'>>,
): Promise<void> {
  const db = await getOfflineDB();
  const existing = await db.get(STORES.syncQueue, id);
  if (!existing) return;

  const updated: PendingOperation = {
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };

  await db.put(STORES.syncQueue, updated);
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete(STORES.syncQueue, id);
  emitOfflineEvent('queueChanged');
}

export async function getQueueItemsByEntity(entity: string): Promise<PendingOperation[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex(STORES.syncQueue, 'by-entity', entity);
}

export async function getQueueItemsByStatus(status: QueueItemStatus): Promise<PendingOperation[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex(STORES.syncQueue, 'by-status', status);
}
