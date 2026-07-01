import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { DataTableView } from '@/components/data-table/DataTableView';
import { useDataTableQuery } from '@/components/data-table/useDataTableQuery';
import type { DataTableColumn } from '@/components/data-table/types';
import { CustomButton } from '@/components/ui/custom-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { usersService, roleLabel, type AppUser, type UserFormPayload } from '@/services/users.service';
import { operativosService } from '@/services/operativos.service';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';

const EMPTY_FORM: UserFormPayload = {
  name: '',
  email: '',
  document_id: '',
  phone: '',
  organization: 'IDENNA',
  password: '',
  password_confirmation: '',
  is_active: true,
  role: 'registrador',
  current_operativo_id: undefined,
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useDemoAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormPayload>(EMPTY_FORM);

  const table = useDataTableQuery<AppUser>({
    queryKey: ['users'],
    fetchFn: (params) => usersService.listPaginated(params),
    initialPageSize: 15,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['users-roles'],
    queryFn: () => usersService.getRoles(),
  });

  const { data: operativos = [] } = useQuery({
    queryKey: ['operativos'],
    queryFn: () => operativosService.list(),
  });

  const operativoList = Array.isArray(operativos) ? operativos : [];
  const editingIsSuperAdmin = editing?.roles?.includes('super-admin') ?? false;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (editing && !payload.password) {
        delete payload.password;
        delete payload.password_confirmation;
      }
      if (editingIsSuperAdmin) {
        delete payload.role;
      }
      if (editing) {
        return usersService.update(editing.id, payload);
      }
      return usersService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      toast.success(editing ? 'Usuario actualizado' : 'Usuario creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      current_operativo_id: operativoList[0]?.id,
    });
    setDialogOpen(true);
  };

  const openEdit = (user: AppUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      document_id: user.document_id ?? '',
      phone: user.phone ?? '',
      organization: user.organization ?? '',
      password: '',
      password_confirmation: '',
      is_active: user.is_active,
      role: user.roles[0] ?? 'registrador',
      current_operativo_id: user.current_operativo?.id,
    });
    setDialogOpen(true);
  };

  const columns = useMemo<DataTableColumn<AppUser>[]>(
    () => [
      {
        id: 'name',
        header: 'Nombre',
        cell: ({ item }) => (
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.email}</p>
          </div>
        ),
      },
      {
        id: 'document_id',
        header: 'Cédula',
        cell: ({ item }) => item.document_id || '—',
      },
      {
        id: 'roles',
        header: 'Rol',
        cell: ({ item }) => (
          <Badge variant="secondary">{roleLabel(item.roles[0] ?? '—')}</Badge>
        ),
      },
      {
        id: 'operativo',
        header: 'Operativo',
        cell: ({ item }) => item.current_operativo?.name ?? '—',
        hideBelow: 'md',
      },
      {
        id: 'is_active',
        header: 'Estado',
        cell: ({ item }) => (
          <Badge variant={item.is_active ? 'default' : 'outline'}>
            {item.is_active ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ item }) => (
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
              disabled={
                item.id === Number(currentUser?.id)
                || item.roles.includes('super-admin')
                || deleteMutation.isPending
              }
              onClick={() => {
                if (window.confirm(`¿Eliminar a ${item.name}?`)) {
                  deleteMutation.mutate(item.id);
                }
              }}
              aria-label="Eliminar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white transition-opacity hover:opacity-70 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        headerClassName: 'w-[100px]',
      },
    ],
    [currentUser?.id, deleteMutation],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#103B73] flex items-center gap-2">
            <UserCog className="h-7 w-7" />
            Usuarios
          </h1>
          <p className="text-muted-foreground">
            Alta y gestión de cuentas del sistema (solo super administrador)
          </p>
        </div>
        <CustomButton onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          Nuevo usuario
        </CustomButton>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTableView
            items={table.items}
            columns={columns}
            rowKey={({ item }) => String(item.id)}
            loading={table.isLoading || table.isFetching}
            error={table.error instanceof Error ? table.error.message : null}
            toolbar={{
              search: {
                value: table.search,
                onChange: table.setSearch,
                placeholder: 'Buscar por nombre, correo o cédula…',
              },
            }}
            pagination={{
              ...table.pagination,
              pageSizeOptions: [10, 15, 25, 50],
            }}
            emptyState={{
              title: 'No hay usuarios',
              description: 'Cree el primer usuario del sistema.',
              action: {
                label: 'Nuevo usuario',
                onClick: openCreate,
              },
            }}
            wrapInCard={false}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="user-name">Nombre completo *</Label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="user-email">Correo *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="user-doc">Cédula</Label>
                <Input
                  id="user-doc"
                  value={form.document_id ?? ''}
                  onChange={(e) => setForm({ ...form, document_id: e.target.value })}
                  placeholder="Para vincular registros importados"
                />
              </div>
              <div>
                <Label htmlFor="user-phone">Teléfono</Label>
                <Input
                  id="user-phone"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="user-org">Organización</Label>
                <Input
                  id="user-org"
                  value={form.organization ?? ''}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Rol *</Label>
              {editingIsSuperAdmin ? (
                <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <Badge variant="secondary">{roleLabel('super-admin')}</Badge>
                  <span className="ml-2 text-muted-foreground">Único super administrador del sistema</span>
                </div>
              ) : (
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Operativo asignado</Label>
              <Select
                value={form.current_operativo_id ? String(form.current_operativo_id) : undefined}
                onValueChange={(v) => setForm({ ...form, current_operativo_id: Number(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {operativoList.map((op) => (
                    <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label htmlFor="user-pass">
                  {editing ? 'Nueva contraseña' : 'Contraseña *'}
                </Label>
                <Input
                  id="user-pass"
                  type="password"
                  autoComplete="new-password"
                  value={form.password ?? ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="user-pass2">Confirmar contraseña</Label>
                <Input
                  id="user-pass2"
                  type="password"
                  autoComplete="new-password"
                  value={form.password_confirmation ?? ''}
                  onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_active ?? true}
                onCheckedChange={(c) => setForm({ ...form, is_active: Boolean(c) })}
              />
              Usuario activo
            </label>

            <CustomButton
              className="w-full"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </CustomButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
