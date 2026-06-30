import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogsService, type CatalogItem } from '@/services/catalogs.service';
import { CustomButton } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CatalogTypePage() {
  const { type = '' } = useParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '' });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalog', type],
    queryFn: () => catalogsService.listByType(type),
    enabled: !!type,
  });

  const createMutation = useMutation({
    mutationFn: () => catalogsService.create(type, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', type] });
      setOpen(false);
      setForm({ code: '', name: '' });
      toast.success('Elemento creado');
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
        <Link to="/catalogs" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold capitalize">{type.replace(/_/g, ' ')}</h1>
        </div>
        <CustomButton onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </CustomButton>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{item.code}</CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo elemento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <CustomButton className="w-full" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>Guardar</CustomButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
