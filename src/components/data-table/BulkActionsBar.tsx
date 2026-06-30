import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';

import type { BulkAction } from './types';

export interface BulkActionsBarProps<T> {
  selectedCount: number;
  selectedItems: T[];
  actions: BulkAction<T>[];
  onClear: () => void;
  className?: string;
}

export function BulkActionsBar<T>({
  selectedCount,
  selectedItems,
  actions,
  onClear,
  className,
}: BulkActionsBarProps<T>) {
  const { hasPermission } = useUserPermissions();

  if (selectedCount === 0) return null;

  const visibleActions = actions.filter((action) => {
    if (action.permission && !hasPermission(action.permission)) return false;
    return true;
  });

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2',
        className,
      )}
    >
      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {visibleActions.map((action) => {
          const disabled = action.disabled?.(selectedItems) ?? false;
          return (
            <Button
              key={action.key}
              size="sm"
              variant={action.variant === 'destructive' ? 'destructive' : action.variant || 'outline'}
              onClick={() => !disabled && action.onClick(selectedItems)}
              disabled={disabled}
            >
              {action.icon}
              <span className="ml-1.5">{action.label}</span>
            </Button>
          );
        })}
        <Button size="sm" variant="ghost" onClick={onClear}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}
