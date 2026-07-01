export { REFERENCE_CACHE_KEYS } from '@/lib/referenceDataStorage';

export async function prefetchReferenceData(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;

  const [{ geographyService }, { catalogsService }] = await Promise.all([
    import('@/services/geography.service'),
    import('@/services/catalogs.service'),
  ]);

  await Promise.allSettled([
    geographyService.prefetch(),
    catalogsService.prefetchBundle(),
  ]);
}
