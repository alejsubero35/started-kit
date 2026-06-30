import type { OperationType } from './operation-type';
import type { QueueItemStatus } from './sync-status';

export type PendingOperation = {
  id: string;
  entity: string;
  entityLocalId: string;
  operation: OperationType;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  status: QueueItemStatus;
  error?: string;
};

export type StoredEntity<T = Record<string, unknown>> = {
  id: string;
  entity: string;
  localId: string;
  serverId?: string | number;
  data: T;
  syncStatus: import('./sync-status').RecordSyncStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
};
