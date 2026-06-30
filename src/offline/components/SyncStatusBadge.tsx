import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { RecordSyncStatus } from '@/offline/models/sync-status';

const LABELS: Record<RecordSyncStatus, string> = {
  pending: 'Pendiente de sincronizar',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  failed: 'Error de sincronización',
};

const VARIANTS: Record<RecordSyncStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  syncing: 'secondary',
  synced: 'default',
  failed: 'destructive',
};

const DOT_COLORS: Record<RecordSyncStatus, string> = {
  pending: 'bg-amber-500',
  syncing: 'bg-yellow-400 animate-pulse',
  synced: 'bg-emerald-500',
  failed: 'bg-red-500',
};

export function SyncStatusBadge({
  status,
  className,
}: {
  status?: RecordSyncStatus;
  className?: string;
}) {
  if (!status || status === 'synced') {
    return <span className={cn('inline-block h-5 shrink-0', className)} aria-hidden />;
  }

  return (
    <Badge variant={VARIANTS[status]} className={cn('h-5 shrink-0 gap-1.5 text-[10px] uppercase tracking-wide', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[status])} />
      {LABELS[status]}
    </Badge>
  );
}
