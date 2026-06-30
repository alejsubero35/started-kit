import type { RecordSyncStatus } from '@/offline/models/sync-status';

export type UserRole = 'admin' | 'manager' | 'user';
export type UserStatus = 'active' | 'inactive' | 'pending';

export type UserRecord = {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin: string | null;
};

export type OfflineUserRecord = UserRecord & {
  _localId?: string;
  _syncStatus?: RecordSyncStatus;
  _syncError?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};
