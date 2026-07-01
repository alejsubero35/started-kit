import { apiService } from './api.service';
import type { PaginatedResponse, PaginationParams } from './base/base.service';

export interface NnaRecord {
  id?: number;
  uuid?: string;
  local_uuid?: string;
  operativo_id: number;
  first_name: string;
  last_name: string;
  birth_date?: string;
  age_years?: number;
  gender_id?: number;
  skin_color_id?: number;
  eye_color_id?: number;
  hair_color_id?: number;
  size_id?: number;
  estado_id?: number;
  municipio_id?: number;
  parroquia_id?: number;
  attention_location_id?: number;
  lugar_nna_id?: number;
  notes?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  discapacidad_ids?: number[];
  necesidad_ids?: number[];
  acompanantes?: Array<{
    first_name: string;
    last_name?: string;
    document_id?: string;
    relationship_id?: number;
    phone?: string;
    is_primary_contact?: boolean;
  }>;
}

export interface NnaListItem {
  id: number;
  uuid?: string;
  registration_code?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  birth_date?: string;
  age_years?: number;
  status?: string;
  status_label?: string;
  registered_at?: string;
  synced_at?: string;
}

interface LaravelPaginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

function normalizePaginatedResponse<T>(raw: LaravelPaginated<T>): PaginatedResponse<T> {
  return {
    data: raw.data,
    total: raw.meta.total,
    page: raw.meta.current_page,
    limit: raw.meta.per_page,
    totalPages: raw.meta.last_page,
  };
}

const OFFLINE_QUEUE_KEY = 'sirp_nna_offline_queue';

export const nnaService = {
  async listPaginated(
    params?: PaginationParams & { operativo_id?: number },
  ): Promise<PaginatedResponse<NnaListItem>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('per_page', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.operativo_id) query.set('operativo_id', String(params.operativo_id));
    const qs = query.toString();
    const raw = await apiService.get<LaravelPaginated<NnaListItem>>(`/nna${qs ? `?${qs}` : ''}`, true);
    return normalizePaginatedResponse(raw);
  },

  async get(id: number): Promise<NnaRecord & { id: number; metadata?: Record<string, unknown> }> {
    const res = await apiService.get<{ data: NnaRecord & { id: number } }>(`/nna/${id}`, true);
    return res.data;
  },

  async create(payload: NnaRecord) {
    return apiService.post('/nna', payload, true);
  },

  async update(id: number, payload: Partial<NnaRecord>) {
    return apiService.put(`/nna/${id}`, payload, true);
  },

  async delete(id: number) {
    return apiService.delete(`/nna/${id}`, true);
  },

  async syncBatch(records: NnaRecord[]) {
    return apiService.post('/nna/sync/batch', { records }, true);
  },

  queueOffline(record: NnaRecord): void {
    const queue = this.getOfflineQueue();
    queue.push({ ...record, local_uuid: record.local_uuid ?? crypto.randomUUID() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },

  getOfflineQueue(): NnaRecord[] {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  clearOfflineQueue(): void {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  async flushOfflineQueue(): Promise<number> {
    const queue = this.getOfflineQueue();
    if (!queue.length || !navigator.onLine) return 0;
    await this.syncBatch(queue);
    this.clearOfflineQueue();
    return queue.length;
  },
};
