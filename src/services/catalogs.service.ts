import { apiService } from './api.service';
import {
  getReferenceData,
  setReferenceData,
  REFERENCE_CACHE_KEYS,
} from '@/lib/referenceDataStorage';

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

type CatalogBundle = Record<string, CatalogItem[]>;

let memoryCatalogBundle: CatalogBundle | null = null;

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

async function fetchBundleFromApi(): Promise<CatalogBundle> {
  const res = await apiService.get<{ data: CatalogBundle }>('/catalogs/bundle', true);
  return res.data ?? {};
}

function readCachedBundle(): CatalogBundle | null {
  const cached = getReferenceData<CatalogBundle | null>(REFERENCE_CACHE_KEYS.catalogs, null);
  return cached && Object.keys(cached).length > 0 ? cached : null;
}

function persistBundle(bundle: CatalogBundle): void {
  memoryCatalogBundle = bundle;
  setReferenceData(REFERENCE_CACHE_KEYS.catalogs, bundle);
}

async function resolveBundle(): Promise<CatalogBundle> {
  if (memoryCatalogBundle && Object.keys(memoryCatalogBundle).length > 0) {
    return memoryCatalogBundle;
  }

  if (isOnline()) {
    try {
      const fresh = await fetchBundleFromApi();
      persistBundle(fresh);
      return fresh;
    } catch {
      const cached = readCachedBundle();
      if (cached) {
        memoryCatalogBundle = cached;
        return cached;
      }
      throw new Error('No se pudieron cargar los catálogos. Verifique su conexión.');
    }
  }

  const cached = readCachedBundle();
  if (cached) {
    memoryCatalogBundle = cached;
    return cached;
  }

  throw new Error(
    'No hay catálogos en el dispositivo. Conéctese a internet al menos una vez para descargarlos.',
  );
}

export const catalogsService = {
  async prefetchBundle(): Promise<void> {
    if (!isOnline()) return;
    const fresh = await fetchBundleFromApi();
    persistBundle(fresh);
  },

  async getTypes(): Promise<CatalogTypeOption[]> {
    const res = await apiService.get<{ data: CatalogTypeOption[] }>('/catalogs/types', true);
    return res.data ?? [];
  },

  async listByType(type: string): Promise<CatalogItem[]> {
    const res = await apiService.get<{ data: CatalogItem[] }>(`/catalogs/${type}`, true);
    return (res as { data?: CatalogItem[] }).data ?? (Array.isArray(res) ? res : []);
  },

  async getBundle(): Promise<CatalogBundle> {
    return resolveBundle();
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
