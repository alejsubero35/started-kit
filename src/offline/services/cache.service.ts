import { getOfflineDB } from '../database/indexeddb';
import { STORES } from '../database/migrations';
import type { SyncMetadata } from '../models/sync-status';

const METADATA_KEY = 'sync';

export async function getSyncMetadata(): Promise<SyncMetadata> {
  const db = await getOfflineDB();
  const row = await db.get(STORES.metadata, METADATA_KEY);
  const value = (row?.value ?? {}) as Partial<SyncMetadata>;

  return {
    lastSyncAt: value.lastSyncAt ?? null,
    lastSyncError: value.lastSyncError ?? null,
    isSyncing: value.isSyncing ?? false,
  };
}

export async function setSyncMetadata(patch: Partial<SyncMetadata>): Promise<void> {
  const db = await getOfflineDB();
  const current = await getSyncMetadata();
  const next = { ...current, ...patch };

  await db.put(STORES.metadata, {
    key: METADATA_KEY,
    value: next,
    updatedAt: new Date().toISOString(),
  });
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getOfflineDB();
  const row = await db.get(STORES.settings, key);
  return (row?.value as T) ?? fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getOfflineDB();
  await db.put(STORES.settings, {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}
