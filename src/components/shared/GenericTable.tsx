import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CrudConfig, CrudColumn } from '@/types/crud.types';
import {
  DataTable,
  DataTableColumn,
  TablePagination,
  TableToolbar,
} from '@/components/data-table';

interface GenericTableProps<T> {
  config: CrudConfig<T>;
  items: T[];
  isLoading: boolean;
  onEdit: (item: T) => void;
  onDelete: (id: string | number) => void;
  onView?: (item: T) => void;
  selectedItems: (string | number)[];
  onSelectionChange: (items: (string | number)[]) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  currentSort: { field: string; direction: 'asc' | 'desc' };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPaginationChange: (page: number) => void;
}

export function GenericTable<T extends { id: string | number }>({
  config,
  items,
  isLoading,
  onEdit,
  onDelete,
  onView,
  selectedItems,
  onSelectionChange,
  onSort,
  currentSort,
  pagination,
  onPaginationChange,
}: GenericTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const handleSort = (field: string) => {
    const direction =
      currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
    onSort(field, direction);
  };

  const handleDelete = (item: T) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? items.map((item) => item.id) : []);
  };

  const handleSelectItem = (id: string | number, checked: boolean) => {
    onSelectionChange(
      checked ? [...selectedItems, id] : selectedItems.filter((itemId) => itemId !== id),
    );
  };

  const renderCell = (column: CrudColumn, item: T) => {
    const value = item[column.key as keyof T];

    if (column.format) {
      return column.format(value, item);
    }

    switch (column.type) {
      case 'badge':
        return <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs">{String(value)}</span>;
      case 'date':
        return value ? new Date(value as string).toLocaleDateString() : '-';
      case 'boolean':
        return value ? 'Sí' : 'No';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : '-';
      case 'image':
        return value ? (
          <img src={value as string} alt="Preview" className="h-8 w-8 rounded object-cover" />
        ) : (
          '-'
        );
      case 'actions':
        return (
          <div className="flex space-x-2">
            {config.actions?.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant={action.variant || 'ghost'}
                onClick={() => action.onClick(item)}
                disabled={action.disabled?.(item) || false}
              >
                {action.icon}
              </Button>
            ))}
          </div>
        );
      default:
        return value ? String(value) : '-';
    }
  };

  const columns: DataTableColumn<T>[] = [
    ...(config.features?.bulkActions
      ? [
          {
            id: 'select',
            header: (
              <Checkbox
                checked={selectedItems.length === items.length && items.length > 0}
                onCheckedChange={handleSelectAll}
              />
            ),
            cell: ({ item }: { item: T }) => (
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
              />
            ),
          } as DataTableColumn<T>,
        ]
      : []),
    ...config.columns.map(
      (column): DataTableColumn<T> => ({
        id: column.key,
        header: column.sortable ? (
          <div className="flex items-center space-x-2">
            <span>{column.label}</span>
            <Button size="sm" variant="ghost" onClick={() => handleSort(column.key)}>
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          column.label
        ),
        cell: ({ item }) => renderCell(column, item),
      }),
    ),
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        search={
          config.features?.search
            ? {
                value: searchTerm,
                onChange: setSearchTerm,
                placeholder: 'Buscar...',
              }
            : undefined
        }
        onAdd={config.permissions?.create ? () => onEdit({} as T) : undefined}
        addLabel={config.createButtonLabel || 'Crear'}
        permissions={config.permissions}
        loading={isLoading}
      />

      <DataTable
        items={items}
        columns={columns}
        rowKey={({ item }) => item.id.toString()}
        overlay={isLoading}
        overlayUseLogo
        overlayTitle="CARGANDO"
        overlayMessage="Obteniendo datos..."
      />

      {config.features?.pagination && (
        <TablePagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={onPaginationChange}
        />
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="Confirmar Eliminación"
        description="¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
