import type { DBSchema, IDBPDatabase } from 'idb';

export const OFFLINE_DB_NAME = 'started-kit-offline';
export const OFFLINE_DB_VERSION = 1;

export const STORES = {
  entities: 'entities',
  syncQueue: 'sync-queue',
  metadata: 'metadata',
  settings: 'settings',
} as const;

export interface OfflineDBSchema extends DBSchema {
  entities: {
    key: string;
    value: import('../models/pending-operation').StoredEntity;
    indexes: { 'by-entity': string; 'by-sync-status': string };
  };
  'sync-queue': {
    key: string;
    value: import('../models/pending-operation').PendingOperation;
    indexes: { 'by-entity': string; 'by-status': string };
  };
  metadata: {
    key: string;
    value: { key: string; value: unknown; updatedAt: string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown; updatedAt: string };
  };
}

export function runMigrations(db: IDBPDatabase<OfflineDBSchema>): void {
  if (!db.objectStoreNames.contains(STORES.entities)) {
    const entities = db.createObjectStore(STORES.entities, { keyPath: 'id' });
    entities.createIndex('by-entity', 'entity');
    entities.createIndex('by-sync-status', 'syncStatus');
  }

  if (!db.objectStoreNames.contains(STORES.syncQueue)) {
    const queue = db.createObjectStore(STORES.syncQueue, { keyPath: 'id' });
    queue.createIndex('by-entity', 'entity');
    queue.createIndex('by-status', 'status');
  }

  if (!db.objectStoreNames.contains(STORES.metadata)) {
    db.createObjectStore(STORES.metadata, { keyPath: 'key' });
  }

  if (!db.objectStoreNames.contains(STORES.settings)) {
    db.createObjectStore(STORES.settings, { keyPath: 'key' });
  }
}
