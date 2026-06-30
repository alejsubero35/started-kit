import {
  USERS_ENTITY_NAME,
  userEntityAdapter,
} from '../adapters/user.adapter';
import type { CreateUserInput, OfflineUserRecord } from '../types/user.types';
import { useOfflineCollection } from '@/offline/hooks/useOfflineCollection';

const SEED_USERS: OfflineUserRecord[] = [
  { id: 1, name: 'John Doe', email: 'john.doe@example.com', role: 'admin', status: 'active', createdAt: '2024-01-15', lastLogin: '2024-03-10', _syncStatus: 'synced' },
  { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', role: 'user', status: 'active', createdAt: '2024-02-20', lastLogin: '2024-03-09', _syncStatus: 'synced' },
  { id: 3, name: 'Bob Johnson', email: 'bob.johnson@example.com', role: 'manager', status: 'inactive', createdAt: '2024-01-25', lastLogin: '2024-02-28', _syncStatus: 'synced' },
  { id: 4, name: 'Alice Brown', email: 'alice.brown@example.com', role: 'user', status: 'active', createdAt: '2024-03-01', lastLogin: '2024-03-10', _syncStatus: 'synced' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie.wilson@example.com', role: 'user', status: 'pending', createdAt: '2024-03-05', lastLogin: null, _syncStatus: 'synced' },
];

export function useUsersOffline() {
  const collection = useOfflineCollection<OfflineUserRecord>({
    entity: USERS_ENTITY_NAME,
    adapter: userEntityAdapter,
    queryKey: ['users', 'list'],
    seedData: SEED_USERS,
    getLocalId: (record) => String(record._localId ?? record.id),
  });

  const createUser = async (input: CreateUserInput) => {
    return collection.create({
      ...input,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: null,
    } as Omit<OfflineUserRecord, 'id' | '_localId' | '_syncStatus' | '_syncError'>);
  };

  return {
    ...collection,
    createUser,
  };
}

export type { OfflineUserRecord, CreateUserInput, UserRecord } from './types/user.types';
