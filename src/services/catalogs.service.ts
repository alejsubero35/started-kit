import { apiService } from './api.service';

export interface CatalogItem {
  id: number;
  type: string;
  code: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface CatalogTypeOption {
  value: string;
  label: string;
}

export const catalogsService = {
  async getTypes(): Promise<CatalogTypeOption[]> {
    const res = await apiService.get<{ data: CatalogTypeOption[] }>('/catalogs/types', true);
    return res.data ?? [];
  },

  async listByType(type: string): Promise<CatalogItem[]> {
    const res = await apiService.get<{ data: CatalogItem[] }>(`/catalogs/${type}`, true);
    return (res as { data?: CatalogItem[] }).data ?? (Array.isArray(res) ? res : []);
  },

  async getBundle(): Promise<Record<string, CatalogItem[]>> {
    const res = await apiService.get<{ data: Record<string, CatalogItem[]> }>('/catalogs/bundle', true);
    return res.data ?? {};
  },

  async create(type: string, payload: Partial<CatalogItem>) {
    return apiService.post(`/catalogs/${type}`, payload, true);
  },

  async update(type: string, id: number, payload: Partial<CatalogItem>) {
    return apiService.put(`/catalogs/${type}/${id}`, payload, true);
  },

  async remove(type: string, id: number) {
    return apiService.delete(`/catalogs/${type}/${id}`, true);
  },
};
