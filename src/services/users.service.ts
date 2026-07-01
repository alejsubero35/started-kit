import { apiService } from './api.service';
import type { PaginatedResponse, PaginationParams } from './base/base.service';

export interface AppUser {
  id: number;
  name: string;
  email: string;
  document_id?: string | null;
  phone?: string | null;
  organization?: string | null;
  is_active: boolean;
  roles: string[];
  current_operativo?: { id: number; name: string; code: string } | null;
  created_at?: string;
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

function normalizePaginated<T>(raw: LaravelPaginated<T>): PaginatedResponse<T> {
  return {
    data: raw.data,
    total: raw.meta.total,
    page: raw.meta.current_page,
    limit: raw.meta.per_page,
    totalPages: raw.meta.last_page,
  };
}

export interface UserFormPayload {
  name: string;
  email: string;
  document_id?: string;
  phone?: string;
  organization?: string;
  password?: string;
  password_confirmation?: string;
  is_active?: boolean;
  current_operativo_id?: number | null;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  'super-admin': 'Super administrador',
  'admin-nacional': 'Administrador nacional',
  'coordinador-estatal': 'Coordinador estatal',
  registrador: 'Registrador',
  consultor: 'Consultor',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export const usersService = {
  async listPaginated(params?: PaginationParams & { role?: string; is_active?: boolean }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('per_page', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.is_active !== undefined) query.set('is_active', params.is_active ? '1' : '0');
    const qs = query.toString();
    const raw = await apiService.get<LaravelPaginated<AppUser>>(`/users${qs ? `?${qs}` : ''}`, true);
    return normalizePaginated(raw);
  },

  async getRoles(): Promise<string[]> {
    const res = await apiService.get<{ data: string[] }>('/users/roles', true);
    return res.data ?? [];
  },

  async create(payload: UserFormPayload) {
    const res = await apiService.post<UserFormPayload, { data: AppUser; message: string }>('/users', payload, true);
    return res.data;
  },

  async update(id: number, payload: Partial<UserFormPayload>) {
    const res = await apiService.put<Partial<UserFormPayload>, { data: AppUser; message: string }>(
      `/users/${id}`,
      payload,
      true,
    );
    return res.data;
  },

  async remove(id: number) {
    return apiService.delete(`/users/${id}`, true);
  },
};
