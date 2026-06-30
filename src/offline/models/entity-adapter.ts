import type { OperationType } from './operation-type';

export type SyncResult<T = Record<string, unknown>> = {
  serverId: string | number;
  data: T;
};

/**
 * Contrato que cada módulo implementa para conectarse al motor offline.
 * El motor NO conoce detalles de Usuarios, Niños, etc.
 */
export interface EntitySyncAdapter<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Identificador de entidad: "users", "children", "families", ... */
  entity: string;
  /** Query keys de React Query a invalidar tras sincronizar */
  queryKeys: string[][];
  /** Simula o ejecuta la operación contra el backend */
  push: (operation: OperationType, payload: Record<string, unknown>) => Promise<SyncResult<T>>;
  /** Extrae el ID local estable del registro */
  getLocalId: (record: T) => string;
}
