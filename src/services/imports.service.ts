import { apiService } from './api.service';

export interface ImportPreview {
  headers: string[];
  sample_rows: Record<string, string>[];
  total_rows: number;
  suggested_mapping: Record<string, string>;
  google_forms_terremoto?: boolean;
}

export interface ImportBatchResult {
  id: number;
  status: string;
  success_rows?: number;
  failed_rows?: number;
  total_rows?: number;
  summary?: {
    imported?: number;
    skipped?: number;
    failed?: number;
    total?: number;
    mode?: string;
  };
}

export const importsService = {
  async preview(file: File): Promise<ImportPreview> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiService.postFormData<{ data: ImportPreview }>('/imports/preview', fd);
    return res.data;
  },

  async import(
    file: File,
    operativoId: number,
    columnMapping: Record<string, string> = {},
    downloadPhotos = false,
  ): Promise<ImportBatchResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('operativo_id', String(operativoId));
    fd.append('column_mapping', JSON.stringify(columnMapping));
    if (downloadPhotos) fd.append('download_photos', '1');
    const res = await apiService.postFormData<{ data: ImportBatchResult; message?: string }>('/imports', fd);
    return res.data;
  },

  async history() {
    return apiService.get('/imports', true);
  },
};
