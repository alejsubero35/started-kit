import type { OfflineUserRecord } from '../types/user.types';
import type { EntitySyncAdapter, SyncResult } from '@/offline/models/entity-adapter';

const USERS_ENTITY = 'users';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Adaptador de entidad Usuarios.
 * Simula el backend hasta que exista API real.
 */
export const userEntityAdapter: EntitySyncAdapter<OfflineUserRecord> = {
  entity: USERS_ENTITY,
  queryKeys: [['users'], ['users-list'], ['users-table']],

  getLocalId(record) {
    return String(record._localId ?? record.id);
  },

  async push(operation, payload): Promise<SyncResult<OfflineUserRecord>> {
    await delay(600 + Math.random() * 600);

    if (operation === 'CREATE') {
      const serverId = Date.now();
      return {
        serverId,
        data: {
          ...(payload as OfflineUserRecord),
          id: serverId,
          createdAt: (payload.createdAt as string) ?? new Date().toISOString().split('T')[0],
          lastLogin: null,
          _localId: String(payload._localId ?? serverId),
          _syncStatus: 'synced',
        },
      };
    }

    if (operation === 'UPDATE') {
      return {
        serverId: payload.id as number,
        data: {
          ...(payload as OfflineUserRecord),
          _syncStatus: 'synced',
        },
      };
    }

    return {
      serverId: payload.id as number,
      data: payload as OfflineUserRecord,
    };
  },
};

export const USERS_ENTITY_NAME = USERS_ENTITY;
