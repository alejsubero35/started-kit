import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export type StatusConfig = {
  label: string;
  variant: BadgeVariant;
  className?: string;
};

export interface StatusBadgeProps {
  value: string;
  config: Record<string, StatusConfig>;
  fallback?: StatusConfig;
  className?: string;
}

export function StatusBadge({ value, config, fallback, className }: StatusBadgeProps) {
  const entry = config[value] ?? fallback ?? { label: value, variant: 'outline' as const };

  return (
    <Badge variant={entry.variant} className={cn(entry.className, className)}>
      {entry.label}
    </Badge>
  );
}

export const commonStatusConfigs = {
  activeInactive: {
    active: { label: 'Activo', variant: 'default' as const },
    inactive: { label: 'Inactivo', variant: 'secondary' as const },
  },
  yesNo: {
    true: { label: 'Sí', variant: 'default' as const },
    false: { label: 'No', variant: 'secondary' as const },
  },
  pending: {
    pending: { label: 'Pendiente', variant: 'outline' as const },
    active: { label: 'Activo', variant: 'default' as const },
    inactive: { label: 'Inactivo', variant: 'secondary' as const },
  },
};
