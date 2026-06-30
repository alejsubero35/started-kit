import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, MapPin, Palette, User, ClipboardCheck } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { calculateAgeFromBirthDate } from '@/lib/age';
import { toast } from 'sonner';

const formSchema = z
  .object({
    first_name: z.string().trim().min(2, 'Nombre requerido (mín. 2 caracteres)'),
    last_name: z.string().trim().min(2, 'Apellido requerido (mín. 2 caracteres)'),
    birth_date: z.string().optional(),
    age_years: z.coerce.number().min(0, 'Edad inválida').max(25, 'Máximo 25 años').optional(),
    gender_id: z.coerce.number({ invalid_type_error: 'Seleccione género' }).min(1, 'Seleccione género'),
    skin_color_id: z.coerce.number().optional(),
    estado_id: z.coerce.number({ invalid_type_error: 'Seleccione estado' }).min(1, 'Seleccione estado'),
    municipio_id: z.coerce.number({ invalid_type_error: 'Seleccione municipio' }).min(1, 'Seleccione municipio'),
    parroquia_id: z.coerce.number().optional(),
    lugar_nna_id: z.coerce.number().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasBirthDate = Boolean(data.birth_date?.trim());
    const hasAge = data.age_years !== undefined && !Number.isNaN(data.age_years);

    if (!hasBirthDate && !hasAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indique fecha de nacimiento o edad en años',
        path: ['birth_date'],
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

const STEPS = [
  { id: 'identificacion', label: 'Identificación', icon: User },
  { id: 'caracteristicas', label: 'Características', icon: Palette },
  { id: 'ubicacion', label: 'Ubicación', icon: MapPin },
  { id: 'confirmacion', label: 'Confirmación', icon: ClipboardCheck },
] as const;

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  0: ['first_name', 'last_name', 'birth_date', 'age_years', 'gender_id'],
  1: ['skin_color_id'],
  2: ['estado_id', 'municipio_id', 'parroquia_id', 'lugar_nna_id'],
  3: [],
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export default function NnaWizardPage() {
  const navigate = useNavigate();
  const { user } = useDemoAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      birth_date: '',
      gender_id: undefined,
    },
    mode: 'onChange',
  });

  const birthDate = form.watch('birth_date');
  const estadoId = form.watch('estado_id');
  const municipioId = form.watch('municipio_id');
  const ageLocked = Boolean(birthDate?.trim());

  useEffect(() => {
    if (!birthDate) return;
    const age = calculateAgeFromBirthDate(birthDate);
    if (age !== null) {
      form.setValue('age_years', age, { shouldValidate: true });
    }
  }, [birthDate, form]);

  const { data: operativos = [] } = useQuery({
    queryKey: ['operativos'],
    queryFn: () => operativosService.list({ active_only: true }),
  });
  const { data: catalogBundle = {} } = useQuery({
    queryKey: ['catalog-bundle'],
    queryFn: () => catalogsService.getBundle(),
  });
  const { data: estados = [] } = useQuery({
    queryKey: ['estados'],
    queryFn: () => geographyService.getEstados(),
  });
  const { data: municipios = [] } = useQuery({
    queryKey: ['municipios', estadoId],
    queryFn: () => geographyService.getMunicipios(Number(estadoId)),
    enabled: !!estadoId,
  });
  const { data: parroquias = [] } = useQuery({
    queryKey: ['parroquias', municipioId],
    queryFn: () => geographyService.getParroquias(Number(municipioId)),
    enabled: !!municipioId,
  });

  const operativoId = user?.current_operativo?.id ?? (Array.isArray(operativos) ? operativos[0]?.id : undefined);
  const operativoName = user?.current_operativo?.name
    ?? (Array.isArray(operativos) ? operativos.find((o) => o.id === operativoId)?.name : undefined);

  const generos = catalogBundle.genero ?? [];
  const coloresPiel = catalogBundle.color_piel ?? [];
  const lugares = catalogBundle.lugar_nna ?? [];

  const estadoName = useMemo(
    () => estados.find((e) => e.id === Number(estadoId))?.name,
    [estados, estadoId],
  );
  const municipioName = useMemo(
    () => municipios.find((m) => m.id === Number(municipioId))?.name,
    [municipios, municipioId],
  );
  const parroquiaName = useMemo(
    () => parroquias.find((p) => p.id === Number(form.watch('parroquia_id')))?.name,
    [parroquias, form.watch('parroquia_id')],
  );

  const validateCurrentStep = async () => {
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields.length ? fields : undefined);
    return valid;
  };

  const goNext = async () => {
    const valid = await validateCurrentStep();
    if (!valid) {
      toast.error('Complete los campos requeridos antes de continuar');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: FormData) => {
    if (!operativoId) {
      toast.error('No hay operativo activo asignado');
      return;
    }

    const payload: NnaRecord = {
      ...data,
      age_years: data.age_years ?? (data.birth_date ? calculateAgeFromBirthDate(data.birth_date) ?? undefined : undefined),
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
    } catch {
      nnaService.queueOffline(payload);
      toast.warning('Error de red. Registro guardado en cola offline.');
      navigate('/nna');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#103B73]">Nuevo registro NNA</h1>
        <p className="text-muted-foreground">Asistente paso a paso para registro en emergencias</p>
      </div>

      {/* Indicador de pasos */}
      <nav aria-label="Pasos del registro" className="rounded-xl border bg-card p-4">
        <ol className="flex items-start justify-between gap-2">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const isDone = index < step;
            const isCurrent = index === step;

            return (
              <li key={item.id} className="flex flex-1 flex-col items-center text-center min-w-0">
                <div className="flex w-full items-center">
                  {index > 0 && (
                    <div className={cn('h-0.5 flex-1', isDone || isCurrent ? 'bg-[#103B73]' : 'bg-muted')} />
                  )}
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                      isDone && 'border-[#103B73] bg-[#103B73] text-white',
                      isCurrent && !isDone && 'border-[#103B73] bg-white text-[#103B73]',
                      !isDone && !isCurrent && 'border-muted bg-muted/30 text-muted-foreground',
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn('h-0.5 flex-1', isDone ? 'bg-[#103B73]' : 'bg-muted')} />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-[11px] sm:text-xs font-medium leading-tight',
                    isCurrent ? 'text-[#103B73]' : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#103B73]" />
                Identificación
              </CardTitle>
              <CardDescription>Datos básicos del niño, niña o adolescente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="first_name">Nombres *</Label>
                <Input id="first_name" {...form.register('first_name')} placeholder="Ej. María José" />
                <FieldError message={form.formState.errors.first_name?.message} />
              </div>
              <div>
                <Label htmlFor="last_name">Apellidos *</Label>
                <Input id="last_name" {...form.register('last_name')} placeholder="Ej. Pérez González" />
                <FieldError message={form.formState.errors.last_name?.message} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    {...form.register('birth_date')}
                  />
                  <FieldError message={form.formState.errors.birth_date?.message} />
                  <p className="text-xs text-muted-foreground mt-1">Si la conoce, la edad se calcula automáticamente</p>
                </div>
                <div>
                  <Label htmlFor="age_years">Edad (años)</Label>
                  <Input
                    id="age_years"
                    type="number"
                    min={0}
                    max={25}
                    disabled={ageLocked}
                    {...form.register('age_years')}
                    placeholder={ageLocked ? 'Calculada' : 'Si no hay fecha'}
                  />
                  <FieldError message={form.formState.errors.age_years?.message} />
                </div>
              </div>
              <div>
                <Label>Género *</Label>
                <Controller
                  control={form.control}
                  name="gender_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        {generos.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.gender_id?.message} />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-[#103B73]" />
                Características
              </CardTitle>
              <CardDescription>Información complementaria del registro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Color de piel</Label>
                <Controller
                  control={form.control}
                  name="skin_color_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {coloresPiel.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea id="notes" {...form.register('notes')} rows={4} placeholder="Notas adicionales relevantes..." />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#103B73]" />
                Ubicación
              </CardTitle>
              <CardDescription>Estado, municipio y parroquia en Venezuela</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Estado *</Label>
                <Controller
                  control={form.control}
                  name="estado_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        form.setValue('municipio_id', undefined as unknown as number);
                        form.setValue('parroquia_id', undefined);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                      <SelectContent>
                        {estados.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.estado_id?.message} />
              </div>
              <div>
                <Label>Municipio *</Label>
                <Controller
                  control={form.control}
                  name="municipio_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        form.setValue('parroquia_id', undefined);
                      }}
                      disabled={!estadoId}
                    >
                      <SelectTrigger><SelectValue placeholder={estadoId ? 'Seleccionar municipio' : 'Primero seleccione estado'} /></SelectTrigger>
                      <SelectContent>
                        {municipios.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.municipio_id?.message} />
              </div>
              <div>
                <Label>Parroquia</Label>
                <Controller
                  control={form.control}
                  name="parroquia_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={!municipioId}
                    >
                      <SelectTrigger><SelectValue placeholder={municipioId ? 'Seleccionar parroquia' : 'Primero seleccione municipio'} /></SelectTrigger>
                      <SelectContent>
                        {parroquias.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>Lugar donde se encuentra</Label>
                <Controller
                  control={form.control}
                  name="lugar_nna_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {lugares.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-[#103B73]" />
                Confirmación
              </CardTitle>
              <CardDescription>Revise los datos antes de guardar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="text-muted-foreground">Nombre:</span> {form.watch('first_name')} {form.watch('last_name')}</p>
                <p><span className="text-muted-foreground">Edad:</span> {form.watch('age_years') ?? '—'} años</p>
                <p><span className="text-muted-foreground">Fecha nac.:</span> {form.watch('birth_date') || '—'}</p>
                <p><span className="text-muted-foreground">Operativo:</span> {operativoName ?? (operativoId ? `#${operativoId}` : 'No asignado')}</p>
                <p><span className="text-muted-foreground">Estado:</span> {estadoName ?? '—'}</p>
                <p><span className="text-muted-foreground">Municipio:</span> {municipioName ?? '—'}</p>
                <p><span className="text-muted-foreground">Parroquia:</span> {parroquiaName ?? '—'}</p>
              </div>
              <p className="text-muted-foreground pt-2 border-t">
                Al guardar, el registro se enviará al servidor o quedará en cola offline si no hay conexión.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-6 gap-3">
          <CustomButton type="button" variant="outline" disabled={step === 0} onClick={goBack}>
            Anterior
          </CustomButton>
          {step < STEPS.length - 1 ? (
            <CustomButton type="button" onClick={() => void goNext()}>
              Siguiente — {STEPS[step + 1].label}
            </CustomButton>
          ) : (
            <CustomButton type="submit" loading={submitting}>
              Guardar registro
            </CustomButton>
          )}
        </div>
      </form>
    </div>
  );
}
