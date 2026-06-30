import { getOfflineDB } from '../indexeddb';
import { STORES } from '../migrations';
import type { StoredEntity } from '../../models/pending-operation';
import type { RecordSyncStatus } from '../../models/sync-status';

function entityKey(entity: string, localId: string): string {
  return `${entity}:${localId}`;
}

export class GenericRepository<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(private readonly entity: string) {}

  async getAll(): Promise<StoredEntity<T>[]> {
    const db = await getOfflineDB();
    const all = await db.getAllFromIndex(STORES.entities, 'by-entity', this.entity);
    return all as StoredEntity<T>[];
  }

  async getByLocalId(localId: string): Promise<StoredEntity<T> | undefined> {
    const db = await getOfflineDB();
    return (await db.get(STORES.entities, entityKey(this.entity, localId))) as
      | StoredEntity<T>
      | undefined;
  }

  async upsert(
    localId: string,
    data: T,
    syncStatus: RecordSyncStatus,
    serverId?: string | number,
    error?: string,
  ): Promise<StoredEntity<T>> {
    const db = await getOfflineDB();
    const now = new Date().toISOString();
    const existing = await this.getByLocalId(localId);

    const record: StoredEntity<T> = {
      id: entityKey(this.entity, localId),
      entity: this.entity,
      localId,
      serverId: serverId ?? existing?.serverId,
      data,
      syncStatus,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      error,
    };

    await db.put(STORES.entities, record as StoredEntity);
    return record;
  }

  async updateSyncStatus(
    localId: string,
    syncStatus: RecordSyncStatus,
    patch?: Partial<Pick<StoredEntity<T>, 'serverId' | 'data' | 'error'>>,
  ): Promise<StoredEntity<T> | undefined> {
    const existing = await this.getByLocalId(localId);
    if (!existing) return undefined;

    return this.upsert(
      localId,
      (patch?.data ?? existing.data) as T,
      syncStatus,
      patch?.serverId ?? existing.serverId,
      patch?.error,
    );
  }

  async delete(localId: string): Promise<void> {
    const db = await getOfflineDB();
    await db.delete(STORES.entities, entityKey(this.entity, localId));
  }

  async count(): Promise<number> {
    const items = await this.getAll();
    return items.length;
  }
}
