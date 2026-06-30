import * as React from 'react';
import { Search, Filter, Download, RefreshCw, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import type { DataTableToolbarConfig } from './types';

export interface TableToolbarProps extends DataTableToolbarConfig {
  loading?: boolean;
  className?: string;
}

export function TableToolbar({
  title,
  description,
  search,
  onRefresh,
  onExport,
  onAdd,
  addLabel = 'Crear',
  showFilterButton = false,
  onFilterClick,
  actions,
  permissions,
  loading = false,
  className,
}: TableToolbarProps) {
  const canCreate = permissions?.create !== false;
  const canExport = permissions?.export !== false;

  if (!title && !description && !search && !onRefresh && !onExport && !onAdd && !actions) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description || onRefresh || onExport || onAdd || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={loading}
                className="h-9 w-9"
                aria-label="Actualizar"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            )}
            {onExport && canExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            )}
            {onAdd && canCreate && (
              <Button size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {addLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {(search || showFilterButton) && (
        <div className="flex items-center gap-2">
          {search && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={search.placeholder || 'Buscar...'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {showFilterButton && (
            <Button variant="outline" size="sm" onClick={onFilterClick}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
