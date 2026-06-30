import * as React from 'react';
import {
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';

import type { RowAction } from './types';

export interface RowActionsProps<T> {
  item: T;
  actions: RowAction<T>[];
  maxInline?: number;
  className?: string;
}

function isActionVisible<T>(action: RowAction<T>, item: T): boolean {
  if (action.hidden?.(item)) return false;
  return true;
}

export function RowActions<T>({ item, actions, maxInline = 2, className }: RowActionsProps<T>) {
  const { hasPermission, hasRole } = useUserPermissions();

  const visibleActions = actions.filter((action) => {
    if (!isActionVisible(action, item)) return false;
    if (action.permission && !hasPermission(action.permission)) return false;
    if (action.role && !hasRole(action.role)) return false;
    return true;
  });

  if (visibleActions.length === 0) return null;

  const inlineActions = visibleActions.slice(0, maxInline);
  const overflowActions = visibleActions.slice(maxInline);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {inlineActions.map((action) => {
        const disabled = action.disabled?.(item) ?? false;
        return (
          <Button
            key={action.key}
            variant={action.variant === 'destructive' ? 'outline' : action.variant || 'outline'}
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              action.variant === 'destructive' &&
                'text-destructive hover:text-destructive hover:border-destructive/50',
            )}
            onClick={() => !disabled && action.onClick(item)}
            disabled={disabled}
            title={action.label}
            aria-label={action.label}
          >
            {action.icon}
          </Button>
        );
      })}

      {overflowActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Más acciones">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflowActions.map((action) => {
              const disabled = action.disabled?.(item) ?? false;
              return (
                <DropdownMenuItem
                  key={action.key}
                  onClick={() => !disabled && action.onClick(item)}
                  disabled={disabled}
                  className={cn(
                    'cursor-pointer',
                    action.variant === 'destructive' && 'text-destructive focus:text-destructive',
                  )}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export const createRowActions = {
  view: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'view',
    label: 'Ver',
    icon: <Eye className="h-3.5 w-3.5" />,
    onClick,
    variant: 'outline',
    ...options,
  }),

  edit: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'edit',
    label: 'Editar',
    icon: <Pencil className="h-3.5 w-3.5" />,
    onClick,
    variant: 'outline',
    ...options,
  }),

  delete: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'delete',
    label: 'Eliminar',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    onClick,
    variant: 'destructive',
    ...options,
  }),

  activate: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'activate',
    label: 'Activar',
    icon: <Power className="h-3.5 w-3.5" />,
    onClick,
    variant: 'outline',
    ...options,
  }),

  deactivate: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'deactivate',
    label: 'Desactivar',
    icon: <PowerOff className="h-3.5 w-3.5" />,
    onClick,
    variant: 'outline',
    ...options,
  }),

  restore: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'restore',
    label: 'Restaurar',
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    onClick,
    variant: 'outline',
    ...options,
  }),

  download: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'download',
    label: 'Descargar',
    icon: <Download className="h-3.5 w-3.5" />,
    onClick,
    variant: 'outline',
    ...options,
  }),

  duplicate: <T,>(onClick: (item: T) => void, options?: Partial<RowAction<T>>): RowAction<T> => ({
    key: 'duplicate',
    label: 'Duplicar',
    icon: <Copy className="h-3.5 w-3.5" />,
    onClick,
    variant: 'outline',
    ...options,
  }),
};
