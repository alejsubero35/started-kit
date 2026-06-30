import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { catalogsService } from '@/services/catalogs.service';
import { geographyService } from '@/services/geography.service';
import { operativosService } from '@/services/operativos.service';
import { nnaService, type NnaRecord } from '@/services/nna.service';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { CustomButton } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const schema = z.object({
  first_name: z.string().min(2, 'Nombre requerido'),
  last_name: z.string().min(2, 'Apellido requerido'),
  age_years: z.coerce.number().min(0).max(25).optional(),
  birth_date: z.string().optional(),
  gender_id: z.coerce.number().optional(),
  skin_color_id: z.coerce.number().optional(),
  estado_id: z.coerce.number().optional(),
  municipio_id: z.coerce.number().optional(),
  parroquia_id: z.coerce.number().optional(),
  lugar_nna_id: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ['Identificación', 'Características', 'Ubicación', 'Confirmación'];

export default function NnaWizardPage() {
  const navigate = useNavigate();
  const { user } = useDemoAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { first_name: '', last_name: '' } });
  const estadoId = form.watch('estado_id');

  const { data: operativos = [] } = useQuery({ queryKey: ['operativos'], queryFn: () => operativosService.list({ active_only: true }) });
  const { data: catalogBundle = {} } = useQuery({ queryKey: ['catalog-bundle'], queryFn: () => catalogsService.getBundle() });
  const { data: estados = [] } = useQuery({ queryKey: ['estados'], queryFn: () => geographyService.getEstados() });
  const { data: municipios = [] } = useQuery({
    queryKey: ['municipios', estadoId],
    queryFn: () => geographyService.getMunicipios(Number(estadoId)),
    enabled: !!estadoId,
  });

  const operativoId = user?.current_operativo?.id ?? (Array.isArray(operativos) ? operativos[0]?.id : undefined);

  const onSubmit = async (data: FormData) => {
    if (!operativoId) {
      toast.error('No hay operativo activo asignado');
      return;
    }

    const payload: NnaRecord = {
      ...data,
      operativo_id: operativoId,
      local_uuid: crypto.randomUUID(),
      status: 'complete',
    };

    setSubmitting(true);
    try {
      if (navigator.onLine) {
        await nnaService.create(payload);
        toast.success('Registro NNA guardado y sincronizado');
      } else {
        nnaService.queueOffline(payload);
        toast.success('Registro guardado offline. Se sincronizará al reconectar.');
      }
      navigate('/nna');
    } catch (e) {
      nnaService.queueOffline(payload);
      toast.warning('Error de red. Registro guardado en cola offline.');
      navigate('/nna');
    } finally {
      setSubmitting(false);
    }
  };

  const generos = catalogBundle.genero ?? [];
  const coloresPiel = catalogBundle.color_piel ?? [];
  const lugares = catalogBundle.lugar_nna ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo registro NNA</h1>
        <p className="text-muted-foreground">Asistente paso a paso — {STEPS[step]}</p>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-4 h-2" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Identificación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Nombres *</Label><Input {...form.register('first_name')} /></div>
              <div><Label>Apellidos *</Label><Input {...form.register('last_name')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Edad (años)</Label><Input type="number" {...form.register('age_years')} /></div>
                <div><Label>Fecha nacimiento</Label><Input type="date" {...form.register('birth_date')} /></div>
              </div>
              <div>
                <Label>Género</Label>
                <Select onValueChange={(v) => form.setValue('gender_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {generos.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Características</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Color de piel</Label>
                <Select onValueChange={(v) => form.setValue('skin_color_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {coloresPiel.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Observaciones</Label><Textarea {...form.register('notes')} rows={3} /></div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Ubicación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Estado</Label>
                <Select onValueChange={(v) => { form.setValue('estado_id', Number(v)); form.setValue('municipio_id', undefined); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                  <SelectContent>
                    {estados.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Municipio</Label>
                <Select onValueChange={(v) => form.setValue('municipio_id', Number(v))} disabled={!estadoId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar municipio" /></SelectTrigger>
                  <SelectContent>
                    {municipios.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lugar donde se encuentra</Label>
                <Select onValueChange={(v) => form.setValue('lugar_nna_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {lugares.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>Confirmación</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Nombre:</strong> {form.watch('first_name')} {form.watch('last_name')}</p>
              <p><strong>Edad:</strong> {form.watch('age_years') ?? '—'} años</p>
              <p><strong>Operativo:</strong> {operativoId ? `#${operativoId}` : 'No asignado'}</p>
              <p className="text-muted-foreground pt-2">Al guardar, el registro se enviará al servidor o quedará en cola offline.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-6">
          <CustomButton type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Anterior
          </CustomButton>
          {step < STEPS.length - 1 ? (
            <CustomButton type="button" onClick={() => setStep((s) => s + 1)}>Siguiente</CustomButton>
          ) : (
            <CustomButton type="submit" loading={submitting}>Guardar registro</CustomButton>
          )}
        </div>
      </form>
    </div>
  );
}
