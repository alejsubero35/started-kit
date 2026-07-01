/** Descarga datos tabulares como CSV (abre en Excel). */
export function downloadChartCsv(
  filename: string,
  columns: [string, string],
  rows: Array<Record<string, string | number>>,
  labelKey: string,
  valueKey: string,
): void {
  const lines = [
    columns.join(','),
    ...rows.map((row) => {
      const label = String(row[labelKey] ?? '').replace(/"/g, '""');
      const value = String(row[valueKey] ?? 0);
      return `"${label}",${value}`;
    }),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `${filename}.csv`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
