import * as React from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { TableEmptyStateConfig } from './types';

export interface TableEmptyStateProps extends TableEmptyStateConfig {
  className?: string;
}

export function TableEmptyState({
  icon,
  title,
  description = 'No se encontraron registros para mostrar.',
  action,
  className,
}: TableEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-border bg-card',
        className,
      )}
    >
      {icon ?? (
        <div className="rounded-full bg-muted p-3 mb-4">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
