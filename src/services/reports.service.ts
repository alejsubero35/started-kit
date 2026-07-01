import { apiService } from './api.service';
import { getApiBase } from '@/config/api';

export interface DashboardStats {
  kpis: { total: number; today: number; draft: number; synced: number };
  by_estado: Array<{ estado_id: number; name: string; total: number }>;
  by_gender: Array<{ gender_id: number; name: string; total: number }>;
  by_age_group: Array<{ group: string; total: number }>;
  by_lugar: Array<{ lugar_nna_id: number; name: string; total: number }>;
  timeline: Array<{ date: string; total: number }>;
  productivity_by_user: Array<{ user_id: number; name: string; total: number }>;
  filters_applied?: Record<string, unknown>;
}

export interface DashboardFilters {
  operativo_id?: number;
  estado_id?: number;
  from?: string;
  to?: string;
}

interface AsyncExportResponse {
  async: true;
  token: string;
  total: number;
  message: string;
}

interface ExportStatusResponse {
  status: 'processing' | 'ready' | 'failed';
  message?: string;
  total?: number;
  filename?: string;
}

const TOKEN_KEY = 'auth_token';

async function downloadBlob(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Error al descargar archivo' }));
    throw new Error(body.message || 'Error al descargar archivo');
  }
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function pollExportUntilReady(
  token: string,
  onProgress?: (message: string) => void,
): Promise<{ filename: string }> {
  const maxAttempts = 120;
  const delayMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await apiService.get<ExportStatusResponse>(
      `/reports/export/${token}/status`,
      true,
    );

    if (status.status === 'ready') {
      return { filename: status.filename ?? 'registros-nna.xlsx' };
    }

    if (status.status === 'failed') {
      throw new Error(status.message || 'La exportación falló');
    }

    onProgress?.(
      status.total
        ? `Procesando ${status.total.toLocaleString('es-VE')} registros…`
        : 'Generando exportación…',
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('La exportación tardó demasiado. Intente de nuevo o use formato CSV.');
}

export const dashboardService = {
  async getStats(filters: DashboardFilters = {}): Promise<DashboardStats> {
    const params = new URLSearchParams();
    if (filters.operativo_id) params.set('operativo_id', String(filters.operativo_id));
    if (filters.estado_id) params.set('estado_id', String(filters.estado_id));
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const qs = params.toString();
    const res = await apiService.get<{ data: DashboardStats }>(
      `/dashboard/stats${qs ? `?${qs}` : ''}`,
      true,
    );
    return res.data;
  },

  async exportPanel(format: 'pdf' | 'csv' | 'xlsx', filters: DashboardFilters = {}): Promise<void> {
    const params = new URLSearchParams({ format: format === 'xlsx' ? 'csv' : format });
    if (filters.operativo_id) params.set('operativo_id', String(filters.operativo_id));
    if (filters.estado_id) params.set('estado_id', String(filters.estado_id));
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);

    const token = localStorage.getItem(TOKEN_KEY);
    const url = `${getApiBase()}/dashboard/export?${params}`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: 'Error al exportar panel' }));
      throw new Error(body.message || 'Error al exportar panel');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const filename = match?.[1] ?? `panel-nna.${ext}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};

export const reportsService = {
  async export(
    format: 'xlsx' | 'csv' | 'pdf',
    operativoId?: number,
    onProgress?: (message: string) => void,
  ): Promise<void> {
    const params = new URLSearchParams({ format });
    if (operativoId) params.set('operativo_id', String(operativoId));
    const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
    const defaultFilename = `registros-nna.${ext}`;

    const token = localStorage.getItem(TOKEN_KEY);
    const url = `${getApiBase()}/reports/export?${params}`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: 'Error al exportar' }));
      throw new Error(body.message || 'Error al exportar');
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = (await response.json()) as AsyncExportResponse;
      if (!data.async || !data.token) {
        throw new Error('Respuesta de exportación no válida');
      }

      onProgress?.(data.message);
      const { filename } = await pollExportUntilReady(data.token, onProgress);
      await downloadBlob(`${getApiBase()}/reports/export/${data.token}/download`, filename);
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? defaultFilename;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
