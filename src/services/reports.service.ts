import { apiService } from './api.service';

export interface DashboardStats {
  kpis: { total: number; today: number; draft: number; synced: number };
  by_estado: Array<{ estado_id: number; name: string; total: number }>;
  by_gender: Array<{ gender_id: number; name: string; total: number }>;
  by_age_group: Array<{ group: string; total: number }>;
  timeline: Array<{ date: string; total: number }>;
  productivity_by_user: Array<{ user_id: number; name: string; total: number }>;
}

export const dashboardService = {
  async getStats(operativoId?: number): Promise<DashboardStats> {
    const qs = operativoId ? `?operativo_id=${operativoId}` : '';
    const res = await apiService.get<{ data: DashboardStats }>(`/dashboard/stats${qs}`, true);
    return res.data;
  },
};

export const reportsService = {
  export(format: 'xlsx' | 'csv' | 'pdf', operativoId?: number) {
    const params = new URLSearchParams({ format });
    if (operativoId) params.set('operativo_id', String(operativoId));
    const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
    return apiService.downloadFile(`/reports/export?${params}`, `registros-nna.${ext}`);
  },
};
