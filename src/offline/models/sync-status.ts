export const QUEUE_STATUSES = ['PENDING', 'SYNCING', 'SUCCESS', 'FAILED'] as const;
export type QueueItemStatus = (typeof QUEUE_STATUSES)[number];

export const RECORD_SYNC_STATUSES = ['pending', 'syncing', 'synced', 'failed'] as const;
export type RecordSyncStatus = (typeof RECORD_SYNC_STATUSES)[number];

export type SyncMetadata = {
  lastSyncAt: string | null;
  lastSyncError: string | null;
  isSyncing: boolean;
};
