import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogsService, type CatalogItem } from '@/services/catalogs.service';
import { CustomButton } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

type FormState = { code: string; name: string };

const emptyForm: FormState = { code: '', name: '' };

export default function CatalogTypePage() {
  const { type = '' } = useParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalog', type],
    queryFn: () => catalogsService.listByType(type),
    enabled: !!type,
  });

  const resetDialog = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({ code: item.code, name: item.name });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? catalogsService.update(type, editing.id, form)
        : catalogsService.create(type, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', type] });
      resetDialog();
      toast.success(editing ? 'Elemento actualizado' : 'Elemento creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => catalogsService.remove(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', type] });
      toast.success('Elemento eliminado');
    },
  });

  const list = Array.isArray(items) ? items : (items as { data?: CatalogItem[] }).data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/catalogs" className="text-muted-foreground hover:text-[#103B73]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold capitalize text-[#103B73]">{type.replace(/_/g, ' ')}</h1>
        </div>
        <CustomButton onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          Agregar
        </CustomButton>
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className="space-y-2">
          {list.map((item: CatalogItem) => (
            <Card key={item.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label="Editar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white transition-opacity hover:opacity-70"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item.id)}
                      aria-label="Eliminar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white transition-opacity hover:opacity-70"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{item.code}</CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : resetDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar elemento' : 'Nuevo elemento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <CustomButton
              className="w-full"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!form.code.trim() || !form.name.trim()}
            >
              {editing ? 'Guardar cambios' : 'Crear'}
            </CustomButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
