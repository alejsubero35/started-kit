import { apiService } from './api.service';

export interface Operativo {
  id: number;
  uuid: string;
  code: string;
  name: string;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  started_at?: string;
  ended_at?: string;
}

export const operativosService = {
  async list(params?: { active_only?: boolean }) {
    const query = params?.active_only ? '?active_only=1' : '';
    const res = await apiService.get<{ data: Operativo[] } | Operativo[]>(`/operativos${query}`, true);
    if (Array.isArray(res)) return res;
    return (res as { data?: Operativo[] }).data ?? [];
  },

  async create(payload: Partial<Operativo>) {
    return apiService.post('/operativos', payload, true);
  },

  async update(id: number, payload: Partial<Operativo>) {
    return apiService.put(`/operativos/${id}`, payload, true);
  },

  async remove(id: number) {
    return apiService.delete(`/operativos/${id}`, true);
  },
};
