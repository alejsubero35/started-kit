/** Rutas a assets estáticos respetando BASE_URL (/app/ en Laravel). */
export function assetUrl(path: string): string {
  const normalized = path.replace(/^\//, '');
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${normalized}`;
}
