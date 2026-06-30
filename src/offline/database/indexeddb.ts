import { openDB, type IDBPDatabase } from 'idb';

import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  runMigrations,
  type OfflineDBSchema,
} from './migrations';

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db) {
        runMigrations(db);
      },
    });
  }
  return dbPromise;
}

export async function closeOfflineDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
