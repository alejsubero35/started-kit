import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/custom-button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { importsService, type ImportPreview } from '@/services/imports.service';
import { operativosService } from '@/services/operativos.service';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { Upload, FileSpreadsheet } from 'lucide-react';
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
  const { user } = useDemoAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const { data: operativos = [] } = useQuery({
    queryKey: ['operativos'],
    queryFn: () => operativosService.list({ active_only: true }),
  });

  const operativoId = user?.current_operativo?.id ?? (Array.isArray(operativos) ? operativos[0]?.id : undefined);

  const previewMutation = useMutation({
    mutationFn: (f: File) => importsService.preview(f),
    onSuccess: (data) => {
      setPreview(data);
      setMapping(data.suggested_mapping ?? {});
      toast.success(`${data.total_rows} filas detectadas`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (!file || !operativoId) throw new Error('Archivo u operativo faltante');
      return importsService.import(file, operativoId, mapping);
    },
    onSuccess: () => {
      toast.success('Importación completada');
      setFile(null);
      setPreview(null);
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
        <h1 className="text-2xl font-bold">Importación Google Forms / Excel</h1>
        <p className="text-muted-foreground">Carga CSV o Excel exportado desde Google Forms con mapeo de columnas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Seleccionar archivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFile} className="block w-full text-sm" />
          {file && <p className="mt-2 text-sm text-muted-foreground">{file.name}</p>}
        </CardContent>
      </Card>

      {preview && (
        <>
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
            loading={importMutation.isPending}
            disabled={!mapping.first_name || !mapping.last_name}
            className="w-full"
          >
            Importar {preview.total_rows} registros
          </CustomButton>
        </>
      )}
    </div>
  );
}
