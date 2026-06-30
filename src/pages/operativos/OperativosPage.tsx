import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operativosService, type Operativo } from '@/services/operativos.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const TYPES = [
  { value: 'terremoto', label: 'Terremoto' },
  { value: 'inundacion', label: 'Inundación' },
  { value: 'deslave', label: 'Deslave' },
  { value: 'incendio', label: 'Incendio' },
  { value: 'migracion', label: 'Migración' },
  { value: 'epidemia', label: 'Epidemia' },
  { value: 'otro', label: 'Otro' },
];

export default function OperativosPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'terremoto', description: '' });

  const { data: operativos = [], isLoading } = useQuery({
    queryKey: ['operativos'],
    queryFn: () => operativosService.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => operativosService.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operativos'] });
      setOpen(false);
      setForm({ code: '', name: '', type: 'terremoto', description: '' });
      toast.success('Operativo creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = Array.isArray(operativos) ? operativos : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operativos</h1>
          <p className="text-muted-foreground">Gestión de contingencias y emergencias</p>
        </div>
        <CustomButton onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Nuevo operativo
        </CustomButton>
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((op: Operativo) => (
            <Card key={op.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{op.name}</CardTitle>
                  <Badge variant={op.status === 'active' ? 'default' : 'secondary'}>{op.status_label ?? op.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Código: {op.code}</p>
                <p>Tipo: {op.type_label ?? op.type}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo operativo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="TER-2026-VE-002" />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CustomButton onClick={() => createMutation.mutate()} loading={createMutation.isPending} className="w-full">
              Crear
            </CustomButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
