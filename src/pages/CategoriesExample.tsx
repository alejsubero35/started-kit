import React, { useState } from 'react';
import {
  DataTableView,
  RowActions,
  StatusBadge,
  createRowActions,
  useDataTable,
  type DataTableColumn,
} from '@/components/data-table';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: number;
  name: string;
  code: string;
  slug: string;
  status: string;
}

const mockCategories: Category[] = [
  { id: 1, name: 'CONFITERÍA', code: '12', slug: 'confiteria', status: 'Activo' },
  { id: 2, name: 'SERVICIOS Y RECARGAS', code: '11', slug: 'servicios-y-recargas', status: 'Activo' },
  { id: 3, name: 'QUINCALLERÍA Y MISCELÁNEOS', code: '10', slug: 'quincalleria-y-miscelaneos', status: 'Activo' },
];

const statusConfig = {
  Activo: { label: 'Activo', variant: 'default' as const },
  Inactivo: { label: 'Inactivo', variant: 'secondary' as const },
};

export default function CategoriesExample() {
  const [categories] = useState<Category[]>(mockCategories);

  const table = useDataTable({
    items: categories,
    initialPageSize: 10,
    searchFields: ['name', 'code', 'slug', 'status'],
  });

  const rowActions = [
    createRowActions.edit<Category>((row) => console.log('Editar:', row)),
    createRowActions.delete<Category>((row) => console.log('Eliminar:', row)),
  ];

  const columns: DataTableColumn<Category>[] = [
    {
      id: 'id',
      header: '#',
      headerClassName: 'w-12',
      cellClassName: 'w-12 font-medium text-muted-foreground',
      cell: ({ item }) => <span>{item.id}</span>,
    },
    {
      id: 'name',
      header: 'Nombre',
      sortable: true,
      cell: ({ item }) => (
        <span className="font-medium text-primary hover:underline cursor-pointer">{item.name}</span>
      ),
    },
    {
      id: 'code',
      header: 'Código',
      sortable: true,
      hideBelow: 'sm',
      mobileLabel: 'Código',
      cell: ({ item }) => <span className="tabular-nums">{item.code}</span>,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ item }) => <RowActions item={item} actions={rowActions} />,
    },
  ];

  return (
    <div className="space-y-6">
      <DataTableView<Category>
        items={table.items}
        columns={columns}
        rowKey={({ item }) => String(item.id)}
        wrapInCard
        sort={table.sort}
        onSort={table.setSort}
        toolbar={{
          title: 'Categorías de Productos',
          search: {
            value: table.search,
            onChange: table.setSearch,
            placeholder: 'Buscar categorías...',
          },
          onAdd: () => console.log('Nueva categoría'),
          addLabel: 'Nueva categoría',
          showFilterButton: true,
        }}
        pagination={table.pagination}
        renderExpanded={({ item }) => (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Slug:</span>
              <Badge variant="outline">{item.slug}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Estado:</span>
              <StatusBadge value={item.status} config={statusConfig} />
            </div>
          </div>
        )}
        emptyState={{
          title: 'No hay categorías',
          description: 'No se encontraron categorías registradas.',
          action: { label: 'Nueva categoría', onClick: () => console.log('Nueva categoría') },
        }}
      />
    </div>
  );
}
