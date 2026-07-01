import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ClipboardCheck, MapPin, Palette, Shield, User, Users } from 'lucide-react';
import { catalogsService } from '@/services/catalogs.service';
import { geographyService, getEstadosFromBundle, getMunicipiosFromBundle, getParroquiasFromBundle } from '@/services/geography.service';
import { operativosService } from '@/services/operativos.service';
import { nnaService, type NnaRecord } from '@/services/nna.service';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { CustomButton } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { calculateAgeFromBirthDate } from '@/lib/age';
import { toast } from '@/hooks/use-toast';

const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().optional(),
);

const formSchema = z
  .object({
    first_name: z.string().trim().min(2, 'Nombre requerido (mín. 2 caracteres)'),
    last_name: z.string().trim().min(2, 'Apellido requerido (mín. 2 caracteres)'),
    birth_date: z.string().optional(),
    age_years: z.coerce.number().min(0, 'Edad inválida').max(25, 'Máximo 25 años').optional(),
    gender_id: z.coerce.number({ invalid_type_error: 'Seleccione género' }).min(1, 'Seleccione género'),
    document_id: z.string().optional(),
    peso: z.string().optional(),
    estatura: z.string().optional(),
    skin_color_id: optionalNumber,
    hair_color_id: optionalNumber,
    eye_color_id: optionalNumber,
    vestimenta: z.string().optional(),
    talla_camisa: z.string().optional(),
    talla_pantalon: z.string().optional(),
    talla_panal: z.string().optional(),
    talla_calzado: z.string().optional(),
    talla_sosten: z.string().optional(),
    talla_ropa_interior_f: z.string().optional(),
    talla_ropa_interior_m: z.string().optional(),
    otros_datos: z.string().optional(),
    discapacidad_ids: z.array(z.number()).default([]),
    discapacidad_otro: z.string().optional(),
    estado_id: z.coerce.number({ invalid_type_error: 'Seleccione estado' }).min(1, 'Seleccione estado'),
    municipio_id: z.coerce.number({ invalid_type_error: 'Seleccione municipio' }).min(1, 'Seleccione municipio'),
    parroquia_id: optionalNumber,
    lugar_nna_id: optionalNumber,
    tipo_refugio: z.string().optional(),
    nombre_refugio: z.string().optional(),
    hospital_name: z.string().optional(),
    necesidades_texto: z.string().optional(),
    punto_referencia: z.string().optional(),
    necesidad_ids: z.array(z.number()).default([]),
    has_acompanante: z.boolean().default(false),
    acomp_first_name: z.string().optional(),
    acomp_last_name: z.string().optional(),
    acomp_document_id: z.string().optional(),
    acomp_relationship_id: optionalNumber,
    acomp_phone: z.string().optional(),
    acomp_email: z.string().optional(),
    acomp_direccion: z.string().optional(),
    acomp_direccion_origen: z.string().optional(),
    acomp_estado_id: optionalNumber,
    acomp_municipio_id: optionalNumber,
    acomp_parroquia_id: optionalNumber,
    organo_actuante_id: optionalNumber,
    organo_otro: z.string().optional(),
    organo_municipio: z.string().optional(),
    tipo_medida_id: optionalNumber,
    tipo_medida_otro: z.string().optional(),
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
  { id: 'acompanante', label: 'Acompañante', icon: Users },
  { id: 'protocolo', label: 'Protocolo', icon: Shield },
  { id: 'confirmacion', label: 'Confirmación', icon: ClipboardCheck },
] as const;

type StepId = (typeof STEPS)[number]['id'];
type FormSection = 'hospital' | 'refugio' | 'general';
type LugarKind = 'hospital' | 'refugio' | 'campamento' | 'parque' | 'plaza' | 'calle';

function inferLugarKind(
  lugarNnaId: number | undefined,
  lugares: Array<{ id: number; name: string; code?: string }>,
): LugarKind | null {
  const lugar = lugares.find((l) => l.id === Number(lugarNnaId));
  if (!lugar) return null;

  const code = lugar.code?.toUpperCase() ?? '';
  if (code === 'HOSPITAL') return 'hospital';
  if (code === 'REFUGIO') return 'refugio';
  if (code === 'CAMPAMENTO') return 'campamento';
  if (code === 'PARQUE') return 'parque';
  if (code === 'PLAZA') return 'plaza';
  if (code === 'CALLE') return 'calle';

  const name = lugar.name?.toLowerCase() ?? '';
  if (name.includes('hospital')) return 'hospital';
  if (name.includes('refugio')) return 'refugio';
  if (name.includes('campamento')) return 'campamento';
  if (name.includes('parque')) return 'parque';
  if (name.includes('plaza')) return 'plaza';
  if (name.includes('calle')) return 'calle';

  return null;
}

function inferFormSection(
  meta: Record<string, unknown> | undefined,
  lugarNnaId: number | undefined,
  lugares: Array<{ id: number; name: string; code?: string }>,
): FormSection {
  const lugarKind = inferLugarKind(lugarNnaId, lugares);
  if (lugarKind === 'hospital') return 'hospital';
  if (lugarKind && lugarKind !== 'calle') return 'refugio';

  const fromMeta = meta?.form_section;
  if (fromMeta === 'hospital' || fromMeta === 'refugio') {
    return fromMeta;
  }
  if (meta?.hospital_name) return 'hospital';
  if (meta?.refuge_name || meta?.refuge_type) return 'refugio';
  return 'general';
}

const STEP_FIELDS: Record<StepId, (keyof FormData)[]> = {
  identificacion: ['first_name', 'last_name', 'birth_date', 'age_years', 'gender_id'],
  caracteristicas: [],
  ubicacion: ['estado_id', 'municipio_id'],
  acompanante: [],
  protocolo: [],
  confirmacion: [],
};

const DEFAULT_VALUES: Partial<FormData> = {
  first_name: '',
  last_name: '',
  birth_date: '',
  discapacidad_ids: [],
  necesidad_ids: [],
  has_acompanante: false,
};

function parseNotesField(notes: string | undefined, label: string): string {
  if (!notes) return '';
  const match = notes.match(new RegExp(`${label}:\\s*(.+?)(?:\\n|$)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function mapRecordToFormValues(record: NnaRecord & { id?: number }): Partial<FormData> {
  const meta = (record.metadata ?? {}) as Record<string, unknown>;
  const tallas = (meta.tallas ?? {}) as Record<string, string>;
  const acomp = record.acompanantes?.[0];
  const notes = record.notes ?? '';

  const puntoReferencia =
    (meta.punto_referencia as string)
    ?? (meta.hospital_reference as string)
    ?? (meta.refuge_name as string)
    ?? parseNotesField(notes, 'Nombre refugio/plaza')
    ?? parseNotesField(notes, 'Punto de referencia');

  return {
    ...DEFAULT_VALUES,
    first_name: record.first_name ?? '',
    last_name: record.last_name ?? '',
    birth_date: record.birth_date ?? '',
    age_years: record.age_years,
    gender_id: record.gender_id,
    document_id: (meta.cedula_nna as string) ?? parseNotesField(notes, 'Cédula NNA') ?? '',
    peso: (meta.peso as string) ?? '',
    estatura: (meta.estatura as string) ?? '',
    skin_color_id: record.skin_color_id ?? undefined,
    hair_color_id: record.hair_color_id ?? undefined,
    eye_color_id: record.eye_color_id ?? undefined,
    vestimenta: (meta.vestimenta as string) ?? '',
    talla_camisa: tallas.camisa ?? '',
    talla_pantalon: tallas.pantalon ?? '',
    talla_panal: tallas.panal ?? '',
    talla_calzado: tallas.calzado ?? '',
    talla_sosten: tallas.sosten ?? '',
    talla_ropa_interior_f: tallas.ropa_interior_f ?? '',
    talla_ropa_interior_m: tallas.ropa_interior_m ?? '',
    otros_datos: (meta.otros_datos as string) ?? '',
    discapacidad_ids: (record.discapacidad_ids ?? []).map(Number),
    discapacidad_otro: (meta.discapacidad_otro as string) ?? '',
    estado_id: record.estado_id,
    municipio_id: record.municipio_id,
    parroquia_id: record.parroquia_id ?? undefined,
    lugar_nna_id: record.lugar_nna_id ?? undefined,
    punto_referencia: puntoReferencia,
    tipo_refugio: (meta.refuge_type as string) ?? '',
    nombre_refugio: (meta.refuge_name as string) ?? '',
    hospital_name: (meta.hospital_name as string) ?? '',
    necesidades_texto: (meta.necesidades_texto as string) ?? '',
    necesidad_ids: (record.necesidad_ids ?? []).map(Number),
    has_acompanante: Boolean(acomp),
    acomp_first_name: acomp?.first_name ?? '',
    acomp_last_name: acomp?.last_name ?? '',
    acomp_document_id: acomp?.document_id ?? '',
    acomp_relationship_id: acomp?.relationship_id ?? undefined,
    acomp_phone: acomp?.phone ?? '',
    acomp_email: (meta.acompanante_email as string) ?? '',
    acomp_direccion: (meta.acompanante_direccion as string) ?? '',
    acomp_direccion_origen: (meta.acompanante_direccion_origen as string) ?? '',
    acomp_estado_id: (meta.acompanante_estado_id as number) ?? undefined,
    acomp_municipio_id: (meta.acompanante_municipio_id as number) ?? undefined,
    acomp_parroquia_id: (meta.acompanante_parroquia_id as number) ?? undefined,
    organo_actuante_id: (meta.organo_actuante_id as number) ?? undefined,
    organo_otro: (meta.organo_otro as string) ?? '',
    organo_municipio: (meta.organo_municipio as string) ?? '',
    tipo_medida_id: (meta.tipo_medida_id as number) ?? undefined,
    tipo_medida_otro: (meta.tipo_medida_otro as string) ?? '',
    notes: notes,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

function CatalogMultiSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: Array<{ id: number; name: string }>;
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const checked = value.includes(item.id);
          return (
            <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={checked}
                onCheckedChange={(c) => {
                  onChange(c ? [...value, item.id] : value.filter((id) => id !== item.id));
                }}
              />
              {item.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function NnaWizardPage() {
  const navigate = useNavigate();
  const { id: editIdParam } = useParams();
  const editId = editIdParam ? Number(editIdParam) : undefined;
  const isEditing = Boolean(editId && !Number.isNaN(editId));
  const { user } = useDemoAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: existingRecord, isLoading: loadingRecord } = useQuery({
    queryKey: ['nna', editId],
    queryFn: () => nnaService.get(editId!),
    enabled: isEditing,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });

  const birthDate = form.watch('birth_date');
  const estadoId = form.watch('estado_id');
  const municipioId = form.watch('municipio_id');
  const acompEstadoId = form.watch('acomp_estado_id');
  const acompMunicipioId = form.watch('acomp_municipio_id');
  const hasAcompanante = form.watch('has_acompanante');
  const lugarNnaId = form.watch('lugar_nna_id');
  const ageLocked = Boolean(birthDate?.trim());

  useEffect(() => {
    if (!birthDate) return;
    const age = calculateAgeFromBirthDate(birthDate);
    if (age !== null) form.setValue('age_years', age, { shouldValidate: true });
  }, [birthDate, form]);

  const { data: operativos = [] } = useQuery({
    queryKey: ['operativos'],
    queryFn: () => operativosService.list({ active_only: true }),
  });
  const { data: catalogBundle = {} } = useQuery({
    queryKey: ['catalog-bundle'],
    queryFn: () => catalogsService.getBundle(),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'always',
  });
  const { data: geographyBundle = [] } = useQuery({
    queryKey: ['geography-bundle'],
    queryFn: () => geographyService.getGeographyBundle(),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'always',
  });
  const estados = useMemo(() => getEstadosFromBundle(geographyBundle), [geographyBundle]);
  const municipios = useMemo(
    () => getMunicipiosFromBundle(geographyBundle, Number(estadoId)),
    [geographyBundle, estadoId],
  );
  const parroquias = useMemo(
    () => getParroquiasFromBundle(geographyBundle, Number(municipioId)),
    [geographyBundle, municipioId],
  );
  const acompMunicipios = useMemo(
    () => getMunicipiosFromBundle(geographyBundle, Number(acompEstadoId)),
    [geographyBundle, acompEstadoId],
  );
  const acompParroquias = useMemo(
    () => getParroquiasFromBundle(geographyBundle, Number(acompMunicipioId)),
    [geographyBundle, acompMunicipioId],
  );

  const operativoId = user?.current_operativo?.id ?? (Array.isArray(operativos) ? operativos[0]?.id : undefined);
  const operativoName = user?.current_operativo?.name
    ?? (Array.isArray(operativos) ? operativos.find((o) => o.id === operativoId)?.name : undefined);

  const generos = catalogBundle.genero ?? [];
  const coloresPiel = catalogBundle.color_piel ?? [];
  const coloresCabello = catalogBundle.color_cabello ?? [];
  const coloresOjos = catalogBundle.color_ojos ?? [];
  const discapacidades = catalogBundle.tipo_discapacidad ?? [];
  const necesidades = catalogBundle.necesidad ?? [];
  const parentescos = catalogBundle.parentesco ?? [];
  const organos = catalogBundle.organo_actuante ?? [];
  const tiposMedida = catalogBundle.tipo_medida ?? [];
  const lugares = catalogBundle.lugar_nna ?? [];

  const formSection = useMemo(
    () => inferFormSection(
      existingRecord?.metadata as Record<string, unknown> | undefined,
      lugarNnaId,
      lugares,
    ),
    [existingRecord?.metadata, lugarNnaId, lugares],
  );

  const lugarKind = useMemo(
    () => inferLugarKind(lugarNnaId, lugares),
    [lugarNnaId, lugares],
  );

  const visibleSteps = STEPS;
  const currentStep = visibleSteps[step] ?? visibleSteps[0];
  const isLastStep = step >= visibleSteps.length - 1;

  useEffect(() => {
    if (step >= visibleSteps.length) {
      setStep(Math.max(0, visibleSteps.length - 1));
    }
  }, [step, visibleSteps.length]);

  useEffect(() => {
    if (!existingRecord || hydrated) return;
    if (generos.length === 0) return;

    form.reset(mapRecordToFormValues(existingRecord));
    setHydrated(true);
  }, [existingRecord, generos.length, form, hydrated]);

  const geoName = (list: Array<{ id: number; name: string }>, id?: number) =>
    list.find((x) => x.id === Number(id))?.name ?? '—';

  const catalogName = (list: Array<{ id: number; name: string }>, id?: number) =>
    list.find((x) => x.id === Number(id))?.name ?? '—';

  const validateCurrentStep = async () => {
    const fields = STEP_FIELDS[currentStep.id];
    if (fields.length && !(await form.trigger(fields))) return false;

    if (currentStep.id === 'acompanante' && form.getValues('has_acompanante')) {
      if (!form.getValues('acomp_first_name')?.trim()) {
        form.setError('acomp_first_name', { message: 'Nombre del acompañante requerido' });
        return false;
      }
    }
    return true;
  };

  const goNext = async () => {
    if (!(await validateCurrentStep())) {
      toast({ variant: 'destructive', title: 'Complete los campos requeridos antes de continuar' });
      return;
    }
    setStep((s) => Math.min(s + 1, visibleSteps.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const buildPayload = (data: FormData): NnaRecord => ({
    operativo_id: existingRecord?.operativo_id ?? operativoId!,
    first_name: data.first_name,
    last_name: data.last_name,
    birth_date: data.birth_date || undefined,
    age_years: data.age_years ?? (data.birth_date ? calculateAgeFromBirthDate(data.birth_date) ?? undefined : undefined),
    gender_id: data.gender_id,
    skin_color_id: data.skin_color_id,
    hair_color_id: data.hair_color_id,
    eye_color_id: data.eye_color_id,
    estado_id: data.estado_id,
    municipio_id: data.municipio_id,
    parroquia_id: data.parroquia_id,
    lugar_nna_id: data.lugar_nna_id,
    notes: data.notes,
    status: 'complete',
    discapacidad_ids: data.discapacidad_ids,
    necesidad_ids: data.necesidad_ids,
    acompanantes: data.has_acompanante && data.acomp_first_name?.trim()
      ? [{
          first_name: data.acomp_first_name.trim(),
          last_name: data.acomp_last_name?.trim() || undefined,
          document_id: data.acomp_document_id?.trim() || undefined,
          relationship_id: data.acomp_relationship_id,
          phone: data.acomp_phone?.trim() || undefined,
          is_primary_contact: true,
        }]
      : [],
    metadata: {
      form_section: formSection !== 'general' ? formSection : undefined,
      cedula_nna: data.document_id?.trim() || undefined,
      hospital_name: data.hospital_name?.trim() || undefined,
      refuge_type: data.tipo_refugio?.trim() || undefined,
      refuge_name: data.nombre_refugio?.trim() || undefined,
      necesidades_texto: data.necesidades_texto?.trim() || undefined,
      peso: data.peso?.trim() || undefined,
      estatura: data.estatura?.trim() || undefined,
      vestimenta: data.vestimenta?.trim() || undefined,
      tallas: {
        camisa: data.talla_camisa?.trim() || undefined,
        pantalon: data.talla_pantalon?.trim() || undefined,
        panal: data.talla_panal?.trim() || undefined,
        calzado: data.talla_calzado?.trim() || undefined,
        sosten: data.talla_sosten?.trim() || undefined,
        ropa_interior_f: data.talla_ropa_interior_f?.trim() || undefined,
        ropa_interior_m: data.talla_ropa_interior_m?.trim() || undefined,
      },
      otros_datos: data.otros_datos?.trim() || undefined,
      discapacidad_otro: data.discapacidad_otro?.trim() || undefined,
      punto_referencia: data.punto_referencia?.trim()
        || data.hospital_name?.trim()
        || data.nombre_refugio?.trim()
        || undefined,
      acompanante_direccion: data.acomp_direccion?.trim() || undefined,
      acompanante_direccion_origen: data.acomp_direccion_origen?.trim() || undefined,
      acompanante_email: data.acomp_email?.trim() || undefined,
      acompanante_estado_id: data.acomp_estado_id,
      acompanante_municipio_id: data.acomp_municipio_id,
      acompanante_parroquia_id: data.acomp_parroquia_id,
      organo_actuante_id: data.organo_actuante_id,
      organo_otro: data.organo_otro?.trim() || undefined,
      organo_municipio: data.organo_municipio?.trim() || undefined,
      tipo_medida_id: data.tipo_medida_id,
      tipo_medida_otro: data.tipo_medida_otro?.trim() || undefined,
    },
  });

  const onSubmit = async (data: FormData) => {
    const activeOperativoId = existingRecord?.operativo_id ?? operativoId;
    if (!activeOperativoId) {
      toast({ variant: 'destructive', title: 'No hay operativo activo asignado' });
      return;
    }

    const payload = buildPayload(data);
    payload.operativo_id = activeOperativoId;
    if (!isEditing) payload.local_uuid = crypto.randomUUID();

    setSubmitting(true);
    try {
      if (navigator.onLine) {
        if (isEditing && editId) {
          await nnaService.update(editId, payload);
          toast({ variant: 'success', title: 'Registro NNA actualizado' });
        } else {
          await nnaService.create(payload);
          toast({ variant: 'success', title: 'Registro NNA guardado y sincronizado' });
        }
      } else if (isEditing) {
        toast({ variant: 'destructive', title: 'La edición requiere conexión a internet' });
        return;
      } else {
        nnaService.queueOffline(payload);
        toast({
          variant: 'success',
          title: 'Registro guardado offline',
          description: 'Se sincronizará al reconectar.',
        });
      }
      navigate('/nna');
    } catch {
      if (isEditing) {
        toast({ variant: 'destructive', title: 'No se pudo actualizar el registro' });
      } else {
        nnaService.queueOffline(payload);
        toast({
          variant: 'success',
          title: 'Registro guardado offline',
          description: 'Error de red. Se sincronizará al reconectar.',
        });
        navigate('/nna');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = () => {
    void form.handleSubmit(onSubmit, () => {
      toast({ variant: 'destructive', title: 'Revise los campos marcados antes de guardar' });
    })();
  };

  const sectionLabel = formSection === 'hospital'
    ? 'Hospital'
    : formSection === 'refugio'
      ? 'Refugio / campamento'
      : null;

  const renderGeoSelect = (
    prefix: 'estado' | 'acomp_estado',
    fieldEstado: keyof FormData,
    fieldMuni: keyof FormData,
    fieldParr: keyof FormData,
    muniList: Array<{ id: number; name: string }>,
    parrList: Array<{ id: number; name: string }>,
    estadoList = estados,
    required = false,
  ) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <Label>{required ? 'Estado *' : 'Estado'}</Label>
        <Controller
          control={form.control}
          name={fieldEstado as 'estado_id'}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={(v) => {
                field.onChange(Number(v));
                form.setValue(fieldMuni as 'municipio_id', undefined as unknown as number);
                form.setValue(fieldParr as 'parroquia_id', undefined);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                {estadoList.map((e) => (
                  <SelectItem key={`${prefix}-e-${e.id}`} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div>
        <Label>{required ? 'Municipio *' : 'Municipio'}</Label>
        <Controller
          control={form.control}
          name={fieldMuni as 'municipio_id'}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={(v) => {
                field.onChange(Number(v));
                form.setValue(fieldParr as 'parroquia_id', undefined);
              }}
              disabled={!form.watch(fieldEstado as 'estado_id')}
            >
              <SelectTrigger><SelectValue placeholder="Municipio" /></SelectTrigger>
              <SelectContent>
                {muniList.map((m) => (
                  <SelectItem key={`${prefix}-m-${m.id}`} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div>
        <Label>Parroquia</Label>
        <Controller
          control={form.control}
          name={fieldParr as 'parroquia_id'}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={(v) => field.onChange(Number(v))}
              disabled={!form.watch(fieldMuni as 'municipio_id')}
            >
              <SelectTrigger><SelectValue placeholder="Parroquia" /></SelectTrigger>
              <SelectContent>
                {parrList.map((p) => (
                  <SelectItem key={`${prefix}-p-${p.id}`} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );

  const values = form.watch();

  if (isEditing && (loadingRecord || !hydrated)) {
    return <p className="text-muted-foreground">Cargando registro…</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#103B73]">
          {isEditing ? 'Editar registro NNA' : 'Nuevo registro NNA'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing ? 'Modifique los datos del niño, niña o adolescente' : 'Asistente paso a paso para registro en emergencias'}
          {sectionLabel && (
            <span className="ml-2 inline-flex rounded-full bg-[#103B73]/10 px-2 py-0.5 text-xs font-medium text-[#103B73]">
              Sección: {sectionLabel}
            </span>
          )}
        </p>
      </div>

      <nav aria-label="Pasos del registro" className="rounded-xl border bg-card p-3 overflow-x-auto">
        <ol className="flex items-start justify-between gap-1 min-w-[640px]">
          {visibleSteps.map((item, index) => {
            const isDone = index < step;
            const isCurrent = index === step;
            return (
              <li key={item.id} className="flex flex-1 flex-col items-center text-center min-w-0">
                <div className="flex w-full items-center">
                  {index > 0 && <div className={cn('h-0.5 flex-1', isDone || isCurrent ? 'bg-[#103B73]' : 'bg-muted')} />}
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    isDone && 'border-[#103B73] bg-[#103B73] text-white',
                    isCurrent && !isDone && 'border-[#103B73] bg-white text-[#103B73]',
                    !isDone && !isCurrent && 'border-muted bg-muted/30 text-muted-foreground',
                  )}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  {index < visibleSteps.length - 1 && <div className={cn('h-0.5 flex-1', isDone ? 'bg-[#103B73]' : 'bg-muted')} />}
                </div>
                <span className={cn('mt-1.5 text-[10px] sm:text-xs font-medium leading-tight', isCurrent ? 'text-[#103B73]' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isLastStep) e.preventDefault();
        }}
      >
        {currentStep.id === 'identificacion' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[#103B73]" />Identificación</CardTitle>
              <CardDescription>Datos básicos del NNA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nombres *</Label>
                  <Input id="first_name" {...form.register('first_name')} />
                  <FieldError message={form.formState.errors.first_name?.message} />
                </div>
                <div>
                  <Label htmlFor="last_name">Apellidos *</Label>
                  <Input id="last_name" {...form.register('last_name')} />
                  <FieldError message={form.formState.errors.last_name?.message} />
                </div>
              </div>
              <div>
                <Label htmlFor="document_id">Cédula de identidad</Label>
                <Input id="document_id" {...form.register('document_id')} placeholder="Si no posee, dejar vacío" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                  <Input id="birth_date" type="date" max={new Date().toISOString().slice(0, 10)} {...form.register('birth_date')} />
                  <FieldError message={form.formState.errors.birth_date?.message} />
                </div>
                <div>
                  <Label htmlFor="age_years">Edad (años)</Label>
                  <Input id="age_years" type="number" min={0} max={25} disabled={ageLocked} {...form.register('age_years')} />
                </div>
              </div>
              <div>
                <Label>Género *</Label>
                <Controller control={form.control} name="gender_id" render={({ field }) => (
                  <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar género" /></SelectTrigger>
                    <SelectContent>{generos.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FieldError message={form.formState.errors.gender_id?.message} />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep.id === 'caracteristicas' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-[#103B73]" />Características físicas</CardTitle>
              <CardDescription>Descripción y tallas del NNA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label htmlFor="peso">Peso</Label><Input id="peso" {...form.register('peso')} placeholder="Ej. 34 kg" /></div>
                <div><Label htmlFor="estatura">Estatura</Label><Input id="estatura" {...form.register('estatura')} placeholder="Ej. 1,20 m" /></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {([
                  ['skin_color_id', 'Color de piel', coloresPiel],
                  ['hair_color_id', 'Color de cabello', coloresCabello],
                  ['eye_color_id', 'Color de ojos', coloresOjos],
                ] as const).map(([name, label, items]) => (
                  <div key={name}>
                    <Label>{label}</Label>
                    <Controller control={form.control} name={name} render={({ field }) => (
                      <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{items.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="vestimenta">Descripción de vestimenta al ingreso</Label>
                <Textarea id="vestimenta" {...form.register('vestimenta')} rows={2} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {([
                  ['talla_camisa', 'Talla camisa'],
                  ['talla_pantalon', 'Talla pantalón'],
                  ['talla_panal', 'Talla pañal'],
                  ['talla_calzado', 'Talla calzado'],
                  ['talla_sosten', 'Talla sostén'],
                  ['talla_ropa_interior_f', 'Ropa interior femenina'],
                  ['talla_ropa_interior_m', 'Ropa interior masculina'],
                ] as const).map(([name, label]) => (
                  <div key={name}><Label htmlFor={name}>{label}</Label><Input id={name} {...form.register(name)} /></div>
                ))}
              </div>
              <Controller control={form.control} name="discapacidad_ids" render={({ field }) => (
                <CatalogMultiSelect label="¿Presenta alguna discapacidad?" items={discapacidades} value={field.value} onChange={field.onChange} />
              )} />
              <div>
                <Label htmlFor="discapacidad_otro">Discapacidad (otro / detalle)</Label>
                <Input id="discapacidad_otro" {...form.register('discapacidad_otro')} placeholder="Si no está en la lista" />
              </div>
              <div>
                <Label htmlFor="otros_datos">Otros datos de interés</Label>
                <Textarea id="otros_datos" {...form.register('otros_datos')} rows={2} />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep.id === 'ubicacion' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[#103B73]" />Ubicación y necesidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Lugar donde se encuentra</Label>
                <Controller control={form.control} name="lugar_nna_id" render={({ field }) => (
                  <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Hospital, refugio, plaza, calle…" /></SelectTrigger>
                    <SelectContent>{lugares.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>

              {lugarKind === 'hospital' && (
                <div>
                  <Label htmlFor="hospital_name">Nombre del hospital</Label>
                  <Input id="hospital_name" {...form.register('hospital_name')} placeholder="Ej. Hospital Dr. Páez" />
                </div>
              )}

              {lugarKind === 'refugio' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_refugio">Tipo de refugio</Label>
                    <Input id="tipo_refugio" {...form.register('tipo_refugio')} placeholder="Temporal, permanente, albergue…" />
                  </div>
                  <div>
                    <Label htmlFor="nombre_refugio">Nombre del refugio</Label>
                    <Input id="nombre_refugio" {...form.register('nombre_refugio')} />
                  </div>
                </div>
              )}

              {(lugarKind === 'campamento' || lugarKind === 'parque' || lugarKind === 'plaza') && (
                <div>
                  <Label htmlFor="nombre_refugio">
                    {lugarKind === 'campamento' && 'Nombre del campamento'}
                    {lugarKind === 'parque' && 'Nombre del parque'}
                    {lugarKind === 'plaza' && 'Nombre de la plaza'}
                  </Label>
                  <Input id="nombre_refugio" {...form.register('nombre_refugio')} />
                </div>
              )}

              {lugarKind === 'calle' && (
                <div>
                  <Label htmlFor="punto_referencia">Calle / vía pública</Label>
                  <Input id="punto_referencia" {...form.register('punto_referencia')} placeholder="Nombre de calle, avenida o sector" />
                </div>
              )}

              {renderGeoSelect('estado', 'estado_id', 'municipio_id', 'parroquia_id', municipios, parroquias, estados, true)}
              <FieldError message={form.formState.errors.estado_id?.message ?? form.formState.errors.municipio_id?.message} />

              {lugarKind !== 'calle' && (
                <div>
                  <Label htmlFor="punto_referencia">Punto de referencia</Label>
                  <Input id="punto_referencia" {...form.register('punto_referencia')} placeholder="Dirección, sector, referencia adicional…" />
                </div>
              )}
              <Controller control={form.control} name="necesidad_ids" render={({ field }) => (
                <CatalogMultiSelect label="Necesidades del NNA" items={necesidades} value={field.value} onChange={field.onChange} />
              )} />
              {formSection === 'refugio' && values.necesidades_texto && (
                <div>
                  <Label htmlFor="necesidades_texto">Necesidades (texto importado)</Label>
                  <Textarea id="necesidades_texto" {...form.register('necesidades_texto')} rows={2} readOnly className="bg-muted/30" />
                </div>
              )}
              <div>
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea id="notes" {...form.register('notes')} rows={3} />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep.id === 'acompanante' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#103B73]" />Acompañante</CardTitle>
              <CardDescription>Datos del adulto responsable si el NNA está acompañado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Controller control={form.control} name="has_acompanante" render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(Boolean(c))} />
                )} />
                El NNA se encuentra acompañado
              </label>
              {hasAcompanante && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="acomp_first_name">Nombres *</Label>
                      <Input id="acomp_first_name" {...form.register('acomp_first_name')} />
                      <FieldError message={form.formState.errors.acomp_first_name?.message} />
                    </div>
                    <div><Label htmlFor="acomp_last_name">Apellidos</Label><Input id="acomp_last_name" {...form.register('acomp_last_name')} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label htmlFor="acomp_document_id">Cédula</Label><Input id="acomp_document_id" {...form.register('acomp_document_id')} /></div>
                    <div><Label htmlFor="acomp_phone">Teléfono</Label><Input id="acomp_phone" {...form.register('acomp_phone')} /></div>
                  </div>
                  {formSection === 'hospital' && (
                    <div><Label htmlFor="acomp_email">Correo electrónico</Label><Input id="acomp_email" type="email" {...form.register('acomp_email')} /></div>
                  )}
                  <div>
                    <Label>Parentesco</Label>
                    <Controller control={form.control} name="acomp_relationship_id" render={({ field }) => (
                      <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{parentescos.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  {formSection === 'hospital' && (
                    <div><Label htmlFor="acomp_direccion_origen">Dirección de origen</Label><Input id="acomp_direccion_origen" {...form.register('acomp_direccion_origen')} /></div>
                  )}
                  <div><Label htmlFor="acomp_direccion">Dirección {formSection === 'hospital' ? 'actual' : ''}</Label><Input id="acomp_direccion" {...form.register('acomp_direccion')} /></div>
                  {renderGeoSelect('acomp_estado', 'acomp_estado_id', 'acomp_municipio_id', 'acomp_parroquia_id', acompMunicipios, acompParroquias)}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep.id === 'protocolo' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#103B73]" />Protocolo</CardTitle>
              <CardDescription>Órgano actuante y medida de protección</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Órgano que actúa en el protocolo</Label>
                  <Controller control={form.control} name="organo_actuante_id" render={({ field }) => (
                    <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="CPNNA, CMDNNA…" /></SelectTrigger>
                      <SelectContent>{organos.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label htmlFor="organo_otro">Órgano (otro)</Label><Input id="organo_otro" {...form.register('organo_otro')} /></div>
              </div>
              <div><Label htmlFor="organo_municipio">Municipio del órgano</Label><Input id="organo_municipio" {...form.register('organo_municipio')} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de medida tomada</Label>
                  <Controller control={form.control} name="tipo_medida_id" render={({ field }) => (
                    <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{tiposMedida.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label htmlFor="tipo_medida_otro">Medida (otro)</Label><Input id="tipo_medida_otro" {...form.register('tipo_medida_otro')} /></div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep.id === 'confirmacion' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-[#103B73]" />Confirmación</CardTitle>
              <CardDescription>Revise los datos antes de guardar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="text-muted-foreground">Nombre:</span> {values.first_name} {values.last_name}</p>
                <p><span className="text-muted-foreground">Edad:</span> {values.age_years ?? '—'} años</p>
                <p><span className="text-muted-foreground">Género:</span> {catalogName(generos, values.gender_id)}</p>
                <p><span className="text-muted-foreground">Operativo:</span> {operativoName ?? '—'}</p>
                <p><span className="text-muted-foreground">Lugar:</span> {catalogName(lugares, values.lugar_nna_id)}</p>
                <p><span className="text-muted-foreground">Ubicación:</span> {geoName(estados, values.estado_id)} / {geoName(municipios, values.municipio_id)}</p>
                <p><span className="text-muted-foreground">Referencia:</span> {values.hospital_name || values.nombre_refugio || values.punto_referencia || '—'}</p>
                {(values.peso || values.estatura) && (
                  <p><span className="text-muted-foreground">Peso / estatura:</span> {values.peso || '—'} / {values.estatura || '—'}</p>
                )}
                <p><span className="text-muted-foreground">Acompañante:</span> {values.has_acompanante ? `${values.acomp_first_name} ${values.acomp_last_name ?? ''}`.trim() : 'No'}</p>
                <p><span className="text-muted-foreground">Órgano:</span> {catalogName(organos, values.organo_actuante_id) || values.organo_otro || '—'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-6 gap-3">
          <CustomButton type="button" variant="outline" disabled={step === 0} onClick={goBack}>Anterior</CustomButton>
          {isLastStep ? (
            <CustomButton type="button" loading={submitting} onClick={handleSave}>
              {isEditing ? 'Guardar cambios' : 'Guardar registro'}
            </CustomButton>
          ) : (
            <CustomButton type="button" onClick={() => void goNext()}>
              Siguiente — {visibleSteps[step + 1]?.label}
            </CustomButton>
          )}
        </div>
      </form>
    </div>
  );
}
