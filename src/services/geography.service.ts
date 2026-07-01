import { apiService } from './api.service';
import {
  getReferenceData,
  setReferenceData,
  REFERENCE_CACHE_KEYS,
} from '@/lib/referenceDataStorage';

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

type MunicipioWithParroquias = Municipio & { parroquias?: Parroquia[] };
export type GeographyBundleItem = Estado & { municipios?: MunicipioWithParroquias[] };
export type GeographyBundle = GeographyBundleItem[];

let memoryBundle: GeographyBundle | null = null;

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/** Laravel Resource collections pueden venir como array o como { data: [...] }. */
function unwrapResourceList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

export function normalizeGeographyBundle(raw: unknown): GeographyBundle {
  return unwrapResourceList<GeographyBundleItem>(raw).map((estado) => ({
    id: Number(estado.id),
    code: String(estado.code ?? ''),
    name: String(estado.name ?? ''),
    municipios: unwrapResourceList<MunicipioWithParroquias>(estado.municipios).map((municipio) => ({
      id: Number(municipio.id),
      estado_id: Number(municipio.estado_id ?? estado.id),
      code: String(municipio.code ?? ''),
      name: String(municipio.name ?? ''),
      parroquias: unwrapResourceList<Parroquia>(municipio.parroquias).map((parroquia) => ({
        id: Number(parroquia.id),
        municipio_id: Number(parroquia.municipio_id ?? municipio.id),
        code: String(parroquia.code ?? ''),
        name: String(parroquia.name ?? ''),
      })),
    })),
  }));
}

async function fetchBundleFromApi(): Promise<GeographyBundle> {
  const res = await apiService.get<{ data: unknown }>('/geography/bundle', true);
  return normalizeGeographyBundle(res.data ?? []);
}

function readCachedBundle(): GeographyBundle | null {
  const cached = getReferenceData<unknown>(REFERENCE_CACHE_KEYS.geography, null);
  const normalized = normalizeGeographyBundle(cached);
  return normalized.length > 0 ? normalized : null;
}

function persistBundle(bundle: GeographyBundle): void {
  memoryBundle = bundle;
  setReferenceData(REFERENCE_CACHE_KEYS.geography, bundle);
}

async function resolveBundle(): Promise<GeographyBundle> {
  if (memoryBundle?.length) return memoryBundle;

  if (isOnline()) {
    try {
      const fresh = await fetchBundleFromApi();
      persistBundle(fresh);
      return fresh;
    } catch {
      const cached = readCachedBundle();
      if (cached) {
        memoryBundle = cached;
        return cached;
      }
      throw new Error('No se pudo cargar la geografía. Verifique su conexión.');
    }
  }

  const cached = readCachedBundle();
  if (cached) {
    memoryBundle = cached;
    return cached;
  }

  throw new Error(
    'No hay datos de geografía en el dispositivo. Conéctese a internet al menos una vez para descargarlos.',
  );
}

export function getMunicipiosFromBundle(bundle: GeographyBundle, estadoId: number): Municipio[] {
  if (!estadoId) return [];
  const estado = bundle.find((e) => e.id === Number(estadoId));
  return (estado?.municipios ?? []).map(({ id, estado_id, code, name }) => ({
    id,
    estado_id,
    code,
    name,
  }));
}

export function getParroquiasFromBundle(bundle: GeographyBundle, municipioId: number): Parroquia[] {
  if (!municipioId) return [];
  for (const estado of bundle) {
    const municipio = estado.municipios?.find((m) => m.id === Number(municipioId));
    if (municipio) {
      return (municipio.parroquias ?? []).map(({ id, municipio_id, code, name }) => ({
        id,
        municipio_id,
        code,
        name,
      }));
    }
  }
  return [];
}

export function getEstadosFromBundle(bundle: GeographyBundle): Estado[] {
  return bundle.map(({ id, code, name }) => ({ id, code, name }));
}

export const geographyService = {
  async prefetch(): Promise<void> {
    if (!isOnline()) return;
    const fresh = await fetchBundleFromApi();
    persistBundle(fresh);
  },

  async getGeographyBundle(): Promise<GeographyBundle> {
    return resolveBundle();
  },

  async getEstados(): Promise<Estado[]> {
    const bundle = await resolveBundle();
    return getEstadosFromBundle(bundle);
  },

  async getMunicipios(estadoId: number): Promise<Municipio[]> {
    const bundle = await resolveBundle();
    return getMunicipiosFromBundle(bundle, estadoId);
  },

  async getParroquias(municipioId: number): Promise<Parroquia[]> {
    const bundle = await resolveBundle();
    return getParroquiasFromBundle(bundle, municipioId);
  },

  /** @deprecated Usar getEstados; mantiene compatibilidad con llamadas existentes */
  async getBundle(): Promise<Estado[]> {
    return this.getEstados();
  },
};
