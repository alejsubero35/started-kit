import { apiService } from './api.service';

export interface Estado {
  id: number;
  code: string;
  name: string;
}

export interface Municipio {
  id: number;
  estado_id: number;
  code: string;
  name: string;
}

export interface Parroquia {
  id: number;
  municipio_id: number;
  code: string;
  name: string;
}

export const geographyService = {
  async getEstados(): Promise<Estado[]> {
    const res = await apiService.get<{ data: Estado[] }>('/geography/estados', true);
    return (res as { data?: Estado[] }).data ?? (Array.isArray(res) ? res : []);
  },

  async getMunicipios(estadoId: number): Promise<Municipio[]> {
    const res = await apiService.get<{ data: Municipio[] }>(`/geography/estados/${estadoId}/municipios`, true);
    return (res as { data?: Municipio[] }).data ?? (Array.isArray(res) ? res : []);
  },

  async getParroquias(municipioId: number): Promise<Parroquia[]> {
    const res = await apiService.get<{ data: Parroquia[] }>(`/geography/municipios/${municipioId}/parroquias`, true);
    return (res as { data?: Parroquia[] }).data ?? (Array.isArray(res) ? res : []);
  },

  async getBundle(): Promise<Estado[]> {
    const res = await apiService.get<{ data: Estado[] }>('/geography/bundle', true);
    return res.data ?? [];
  },
};
