import { apiService } from './api.service';

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

const OFFLINE_QUEUE_KEY = 'sirp_nna_offline_queue';

export const nnaService = {
  async list(params?: { operativo_id?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.operativo_id) query.set('operativo_id', String(params.operativo_id));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query}` : '';
    return apiService.get(`/nna${qs}`, true);
  },

  async get(id: number) {
    return apiService.get(`/nna/${id}`, true);
  },

  async create(payload: NnaRecord) {
    return apiService.post('/nna', payload, true);
  },

  async update(id: number, payload: Partial<NnaRecord>) {
    return apiService.put(`/nna/${id}`, payload, true);
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
