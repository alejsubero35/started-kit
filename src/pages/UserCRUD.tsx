import React, { useState } from 'react';
import {
  DataTableView,
  RowActions,
  StatusBadge,
  createRowActions,
  useDataTable,
  type DataTableColumn,
} from '@/components/data-table';
import { GenericForm, FormFieldConfig } from '@/components/forms/GenericForm';
import { CustomButton } from '@/components/ui/custom-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { useUsersOffline, type OfflineUserRecord } from '@/features/users/hooks/useUsersOffline';
import { SyncStatusBadge } from '@/offline/components/SyncStatusBadge';
import { Calendar, Plus, Users, Shield } from 'lucide-react';
import { z } from 'zod';

const roleConfig = {
  admin: { label: 'Administrador', variant: 'destructive' as const },
  manager: { label: 'Manager', variant: 'default' as const },
  user: { label: 'Usuario', variant: 'secondary' as const },
};

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const },
  inactive: { label: 'Inactivo', variant: 'secondary' as const },
  pending: { label: 'Pendiente', variant: 'outline' as const },
};

export default function UserCRUD() {
  const { user: currentUser, hasRole } = useDemoAuth();
  const { items: users, createUser, isLoading, pendingCount } = useUsersOffline();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OfflineUserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<OfflineUserRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const table = useDataTable({
    items: users,
    initialPageSize: 10,
    searchFields: ['name', 'email', 'role', 'status'],
    getItemId: (item) => String(item._localId ?? item.id),
  });

  const formFields: FormFieldConfig[] = [
    { name: 'name', label: 'Nombre', type: 'text', placeholder: 'Ingrese el nombre completo', required: true, validation: z.string().min(2, 'El nombre debe tener al menos 2 caracteres') },
    { name: 'email', label: 'Correo Electrónico', type: 'email', placeholder: 'correo@ejemplo.com', required: true, validation: z.string().email('Ingrese un correo válido') },
    { name: 'role', label: 'Rol', type: 'select', required: true, options: [{ value: 'user', label: 'Usuario' }, { value: 'manager', label: 'Manager' }, { value: 'admin', label: 'Administrador' }], validation: z.enum(['user', 'manager', 'admin']) },
    { name: 'status', label: 'Estado', type: 'select', required: true, options: [{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }, { value: 'pending', label: 'Pendiente' }], validation: z.enum(['active', 'inactive', 'pending']) },
  ];

  const rowActions = [
    createRowActions.view<OfflineUserRecord>((user) => console.log('View user:', user)),
    createRowActions.edit<OfflineUserRecord>((user) => setEditingUser(user), {
      disabled: (user) => !hasRole('admin') && user.id !== currentUser?.id,
      role: undefined,
    }),
    createRowActions.delete<OfflineUserRecord>((user) => setUserToDelete(user), {
      disabled: (user) => !hasRole('admin') || user.id === currentUser?.id,
    }),
  ];

  const columns: DataTableColumn<OfflineUserRecord>[] = [
    {
      id: 'name',
      header: 'Nombre',
      sortable: true,
      cell: ({ item }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.name}</span>
              <SyncStatusBadge status={item._syncStatus} />
            </div>
            <div className="text-sm text-muted-foreground">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Rol',
      sortable: true,
      hideBelow: 'md',
      mobileLabel: 'Rol',
      cell: ({ item }) => <StatusBadge value={item.role} config={roleConfig} />,
    },
    {
      id: 'status',
      header: 'Estado',
      sortable: true,
      hideBelow: 'lg',
      mobileLabel: 'Estado',
      cell: ({ item }) => <StatusBadge value={item.status} config={statusConfig} />,
    },
    {
      id: 'createdAt',
      header: 'Creado',
      sortable: true,
      hideBelow: 'xl',
      mobileLabel: 'Creado',
      cell: ({ item }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{item.createdAt}</span>
        </div>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Último Acceso',
      sortable: true,
      hideBelow: 'xl',
      mobileLabel: 'Último acceso',
      cell: ({ item }) => (
        item.lastLogin ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{item.lastLogin}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Nunca</span>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ item }) => <RowActions item={item} actions={rowActions} />,
    },
  ];

  const handleCreateUser = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await createUser({
        name: String(data.name),
        email: String(data.email),
        role: data.role as OfflineUserRecord['role'],
        status: data.status as OfflineUserRecord['status'],
      });
      setIsCreateDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (data: Record<string, unknown>) => {
    if (!editingUser) return;
    setLoading(true);
    try {
      // UPDATE offline se implementará con la misma infraestructura genérica
      console.log('Update pendiente de adapter UPDATE:', editingUser, data);
      setEditingUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      // DELETE offline se implementará con la misma infraestructura genérica
      console.log('Delete pendiente de adapter DELETE:', userToDelete);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios del sistema. Los registros offline se sincronizan automáticamente.
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <CustomButton leftIcon={<Plus className="h-4 w-4" />}>Nuevo Usuario</CustomButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                El usuario se guardará localmente y se sincronizará cuando haya conexión.
              </DialogDescription>
            </DialogHeader>
            <GenericForm fields={formFields} onSubmit={handleCreateUser} loading={loading} onCancel={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{users.filter((u) => u.status === 'active').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de sync</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado pendiente</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{users.filter((u) => u._syncStatus === 'pending' || u._syncStatus === 'syncing').length}</div>
          </CardContent>
        </Card>
      </div>

      <DataTableView<OfflineUserRecord>
        items={table.items}
        columns={columns}
        rowKey={({ item }) => String(item._localId ?? item.id)}
        wrapInCard
        loading={isLoading}
        sort={table.sort}
        onSort={table.setSort}
        selectable
        selectedIds={table.selectedIds}
        onSelectionChange={table.setSelectedIds}
        toolbar={{
          title: 'Lista de Usuarios',
          description: 'Datos locales con sincronización automática al recuperar conexión',
          search: {
            value: table.search,
            onChange: table.setSearch,
            placeholder: 'Buscar usuarios...',
          },
          onExport: () => console.log('Exporting users...'),
          permissions: { export: hasRole('admin') },
        }}
        pagination={table.pagination}
        emptyState={{
          title: 'No hay usuarios',
          description: 'No se encontraron usuarios en el sistema.',
          action: { label: 'Crear primer usuario', onClick: () => setIsCreateDialogOpen(true) },
        }}
      />

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica la información del usuario seleccionado.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <GenericForm
              fields={formFields}
              onSubmit={handleUpdateUser}
              loading={loading}
              onCancel={() => setEditingUser(null)}
              defaultValues={editingUser}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!userToDelete}
        title="Confirmar eliminación"
        description={`¿Estás seguro de eliminar a ${userToDelete?.name ?? ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
