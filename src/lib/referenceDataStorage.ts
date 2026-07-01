export const REFERENCE_CACHE_KEYS = {
  geography: 'reference:geography-bundle',
  catalogs: 'reference:catalogs-bundle',
} as const;

export function getReferenceData<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setReferenceData<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private browsing — ignore
  }
}
