import { apiService } from './api.service';

export interface ImportPreview {
  headers: string[];
  sample_rows: Record<string, string>[];
  total_rows: number;
  suggested_mapping: Record<string, string>;
}

export const importsService = {
  async preview(file: File): Promise<ImportPreview> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiService.postFormData<{ data: ImportPreview }>('/imports/preview', fd);
    return res.data;
  },

  async import(file: File, operativoId: number, columnMapping: Record<string, string>) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('operativo_id', String(operativoId));
    fd.append('column_mapping', JSON.stringify(columnMapping));
    return apiService.postFormData('/imports', fd);
  },

  async history() {
    return apiService.get('/imports', true);
  },
};
