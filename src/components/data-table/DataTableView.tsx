import * as React from 'react';
import { ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import { BulkActionsBar } from './BulkActionsBar';
import { DataTable } from './DataTable';
import { TableEmptyState } from './TableEmptyState';
import { TablePagination } from './TablePagination';
import { TableSkeleton } from './TableSkeleton';
import { TableToolbar } from './TableToolbar';
import type { DataTableColumn, DataTableViewProps } from './types';

function defaultGetItemId<T>(item: T): string | number {
  return (item as { id: string | number }).id;
}

export function DataTableView<T>({
  items,
  columns,
  rowKey,
  loading = false,
  error = null,
  toolbar,
  pagination,
  emptyState,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions = [],
  sort,
  onSort,
  getItemId = defaultGetItemId,
  ...tableProps
}: DataTableViewProps<T>) {
  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedIds.includes(getItemId(item))),
    [items, selectedIds, getItemId],
  );

  const enhancedColumns = React.useMemo(() => {
    const result: DataTableColumn<T>[] = [];

    if (selectable) {
      const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(getItemId(item)));
      result.push({
        id: 'select',
        header: (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              if (!onSelectionChange) return;
              onSelectionChange(checked ? items.map(getItemId) : []);
            }}
            aria-label="Seleccionar todos"
          />
        ),
        cell: ({ item }) => (
          <Checkbox
            checked={selectedIds.includes(getItemId(item))}
            onCheckedChange={(checked) => {
              if (!onSelectionChange) return;
              const id = getItemId(item);
              onSelectionChange(
                checked
                  ? [...selectedIds, id]
                  : selectedIds.filter((selectedId) => selectedId !== id),
              );
            }}
            aria-label="Seleccionar fila"
          />
        ),
        headerClassName: 'w-10',
        cellClassName: 'w-10',
      });
    }

    for (const column of columns) {
      if (column.sortable && onSort) {
        result.push({
          ...column,
          header: (
            <div className="flex items-center gap-1">
              <span>{column.header}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() =>
                  onSort(
                    column.id,
                    sort?.field === column.id && sort.direction === 'asc' ? 'desc' : 'asc',
                  )
                }
                aria-label={`Ordenar por ${typeof column.header === 'string' ? column.header : column.id}`}
              >
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </div>
          ),
        });
      } else {
        result.push(column);
      }
    }

    return result;
  }, [columns, selectable, selectedIds, items, onSelectionChange, getItemId, onSort, sort]);

  const showEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-4">
      {toolbar && <TableToolbar {...toolbar} loading={loading} />}

      {bulkActions.length > 0 && onSelectionChange && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          selectedItems={selectedItems}
          actions={bulkActions}
          onClear={() => onSelectionChange([])}
        />
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <TableSkeleton
          columns={columns.length}
          showSelection={selectable}
          showActions={columns.some((col) => col.id === 'actions')}
        />
      ) : showEmpty ? (
        emptyState ? (
          <TableEmptyState {...emptyState} />
        ) : (
          <TableEmptyState title="No hay datos" />
        )
      ) : (
        <DataTable
          items={items}
          columns={enhancedColumns}
          rowKey={rowKey}
          overlay={loading && items.length > 0}
          overlayUseLogo
          overlayTitle="CARGANDO"
          overlayMessage="Obteniendo datos..."
          {...tableProps}
        />
      )}

      {pagination && pagination.total > 0 && (
        <TablePagination {...pagination} />
      )}
    </div>
  );
}
