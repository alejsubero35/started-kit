import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/custom-button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { importsService, type ImportBatchResult, type ImportPreview } from '@/services/imports.service';
import { operativosService } from '@/services/operativos.service';
import useAuth from '@/contexts/useAuth';
import { Upload, FileSpreadsheet, Info } from 'lucide-react';
import { toast } from 'sonner';

const MAPPING_FIELDS = [
  { key: 'first_name', label: 'Nombres *' },
  { key: 'last_name', label: 'Apellidos *' },
  { key: 'age_years', label: 'Edad' },
  { key: 'birth_date', label: 'Fecha nacimiento' },
  { key: 'gender', label: 'Género' },
  { key: 'notes', label: 'Observaciones' },
];

export default function ImportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [operativoId, setOperativoId] = useState<number | undefined>(user?.current_operativo?.id);
  const [downloadPhotos, setDownloadPhotos] = useState(false);
  const [lastResult, setLastResult] = useState<ImportBatchResult | null>(null);

  const { data: operativos = [] } = useQuery({
    queryKey: ['operativos'],
    queryFn: () => operativosService.list({ active_only: true }),
  });

  const operativoList = Array.isArray(operativos) ? operativos : [];
  const resolvedOperativoId = operativoId ?? operativoList[0]?.id;

  const previewMutation = useMutation({
    mutationFn: (f: File) => importsService.preview(f),
    onSuccess: (data) => {
      setPreview(data);
      setMapping(data.suggested_mapping ?? {});
      setLastResult(null);
      toast.success(`${data.total_rows} filas detectadas`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (!file || !resolvedOperativoId) throw new Error('Seleccione archivo y operativo');
      const autoMode = preview?.google_forms_terremoto;
      return importsService.import(
        file,
        resolvedOperativoId,
        autoMode ? {} : mapping,
        downloadPhotos,
      );
    },
    onSuccess: (batch) => {
      setLastResult(batch);
      const summary = batch.summary ?? {};
      const imported = summary.imported ?? batch.success_rows ?? 0;
      const skipped = summary.skipped ?? 0;
      const failed = summary.failed ?? batch.failed_rows ?? 0;
      toast.success(`Importación finalizada: ${imported} ok, ${skipped} omitidos, ${failed} fallidos`);
      setFile(null);
      setPreview(null);
      void queryClient.invalidateQueries({ queryKey: ['nna'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      previewMutation.mutate(f);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#103B73]">Importación Google Forms / Excel</h1>
        <p className="text-muted-foreground">
          Equivalente a <code className="text-xs bg-muted px-1 rounded">php artisan nna:import-terremoto</code> desde el navegador
        </p>
      </div>

      <Card className="border-[#2D4473]/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-[#2D4473]" />
            ¿Qué hace esta pantalla?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Sí: puede cargar el mismo Excel de terremoto (<strong>DATA NNA TERREMOTO.xlsx</strong>).
            Si detecta el formato Google Forms, importa automáticamente hospital y refugio (como el comando artisan).
          </p>
          <p>
            Tareas adicionales de servidor (solo consola): rehidratar metadata (
            <code className="text-xs">nna:rehydrate-import-metadata</code>) y crear usuarios registradores (
            <code className="text-xs">nna:import-registradores</code>). Ver <code>docs/COMANDOS-PRODUCCION.md</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operativo destino</CardTitle>
          <CardDescription>Los registros se asociarán a este operativo</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={resolvedOperativoId ? String(resolvedOperativoId) : undefined}
            onValueChange={(v) => setOperativoId(Number(v))}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar operativo" /></SelectTrigger>
            <SelectContent>
              {operativoList.map((op) => (
                <SelectItem key={op.id} value={String(op.id)}>{op.name} ({op.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Seleccionar archivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFile} className="block w-full text-sm" />
          {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
          {preview?.google_forms_terremoto && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={downloadPhotos} onCheckedChange={(c) => setDownloadPhotos(Boolean(c))} />
              Descargar fotos de Google Drive al servidor (como <code>--download-photos</code>)
            </label>
          )}
        </CardContent>
      </Card>

      {preview && (
        <>
          {preview.google_forms_terremoto ? (
            <Card className="border-[#2D4473]/30 bg-[#2D4473]/5">
              <CardContent className="py-4 text-sm space-y-2">
                <p className="font-medium text-[#2D4473]">Formato Google Forms — Terremoto detectado</p>
                <p className="text-muted-foreground">
                  Mapeo automático: secciones Hospital y Refugio, catálogos, geografía, acompañantes y metadata extendida.
                  Las filas ya importadas se omiten (duplicados por timestamp + nombre).
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" /> Mapeo de columnas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MAPPING_FIELDS.map((field) => (
                  <div key={field.key}>
                    <Label>{field.label}</Label>
                    <Select
                      value={mapping[field.key] ?? ''}
                      onValueChange={(v) => setMapping({ ...mapping, [field.key]: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar columna" /></SelectTrigger>
                      <SelectContent>
                        {preview.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {preview.sample_rows.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Vista previa (5 filas)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>{preview.headers.map((h) => <th key={h} className="text-left p-2 border-b">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.sample_rows.map((row, i) => (
                      <tr key={i}>{preview.headers.map((h) => <td key={h} className="p-2 border-b">{row[h] ?? ''}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <CustomButton
            onClick={() => importMutation.mutate()}
            loading={importMutation.isPending || previewMutation.isPending}
            disabled={!resolvedOperativoId || (!preview.google_forms_terremoto && (!mapping.first_name || !mapping.last_name))}
            className="w-full"
          >
            Importar {preview.total_rows} registros
          </CustomButton>
        </>
      )}

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Último resultado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">Importados: {lastResult.summary?.imported ?? lastResult.success_rows ?? 0}</Badge>
            <Badge variant="secondary">Omitidos: {lastResult.summary?.skipped ?? 0}</Badge>
            <Badge variant={lastResult.failed_rows ? 'destructive' : 'outline'}>
              Fallidos: {lastResult.summary?.failed ?? lastResult.failed_rows ?? 0}
            </Badge>
            <Badge variant="outline">Estado: {lastResult.status}</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
