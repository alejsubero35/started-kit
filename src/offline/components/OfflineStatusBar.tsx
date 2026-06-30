import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useOffline } from '../hooks/useOffline';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { subscribeOfflineEvent } from '../services/offline-events';

function formatLastSync(value: string | null): string {
  if (!value) return 'Nunca';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function OfflineStatusBar({ className }: { className?: string }) {
  const { isOnline, isOffline, isSyncing, lastSync, pendingOperations, startSync } = useOffline();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const progressFrameRef = useRef<number | null>(null);
  const pendingProgressRef = useRef({ current: 0, total: 0 });
  const toastGuardRef = useRef(false);

  useEffect(() => {
    const applyProgressUpdate = (current: number, total: number) => {
      pendingProgressRef.current = { current, total };
      if (progressFrameRef.current !== null) return;

      progressFrameRef.current = window.requestAnimationFrame(() => {
        progressFrameRef.current = null;
        const { current: nextCurrent, total: nextTotal } = pendingProgressRef.current;
        setSyncTotal(nextTotal);
        setSyncProgress(nextTotal > 0 ? Math.round((nextCurrent / nextTotal) * 100) : 0);
      });
    };

    const showSyncToast = (synced: number, failed: number) => {
      if (toastGuardRef.current) return;
      toastGuardRef.current = true;
      window.setTimeout(() => {
        toastGuardRef.current = false;
      }, 800);

      if (synced > 0) {
        const description =
          failed > 0
            ? `${synced} registro${synced === 1 ? '' : 's'} sincronizado${synced === 1 ? '' : 's'}, ${failed} con error.`
            : `${synced} registro${synced === 1 ? '' : 's'} sincronizado${synced === 1 ? '' : 's'} correctamente.`;

        toast({
          variant: 'success',
          title: 'Sincronización completada',
          description,
        });
        return;
      }

      if (failed > 0) {
        toast({
          variant: 'destructive',
          title: 'Error de sincronización',
          description: `No se pudieron sincronizar ${failed} registro${failed === 1 ? '' : 's'}.`,
        });
      }
    };

    const unsubscribers = [
      subscribeOfflineEvent('syncStarted', (detail) => {
        const total = detail?.total ?? 0;
        setShowProgressBar(true);
        setSyncTotal(total);
        setSyncProgress(0);
        pendingProgressRef.current = { current: 0, total };
      }),
      subscribeOfflineEvent('syncProgress', (detail) => {
        applyProgressUpdate(detail?.current ?? 0, detail?.total ?? 0);
      }),
      subscribeOfflineEvent('syncCompleted', (detail) => {
        setShowProgressBar(false);
        setSyncProgress(0);
        setSyncTotal(0);
        pendingProgressRef.current = { current: 0, total: 0 };

        const synced = detail?.synced ?? 0;
        const failed = detail?.failed ?? 0;
        showSyncToast(synced, failed);
      }),
      subscribeOfflineEvent('syncFailed', (detail) => {
        setShowProgressBar(false);
        setSyncProgress(0);
        setSyncTotal(0);
        pendingProgressRef.current = { current: 0, total: 0 };

        toast({
          variant: 'destructive',
          title: 'Sincronización fallida',
          description: detail?.error ?? 'Ocurrió un error inesperado.',
        });
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      if (progressFrameRef.current !== null) {
        window.cancelAnimationFrame(progressFrameRef.current);
      }
    };
  }, []);

  const statusLabel = isSyncing ? 'Sincronizando' : isOnline ? 'En línea' : 'Sin conexión';

  const statusColor = isSyncing ? 'bg-amber-500' : isOnline ? 'bg-emerald-500' : 'bg-red-500';

  const syncedCount =
    syncTotal > 0 ? Math.min(syncTotal, Math.round((syncProgress / 100) * syncTotal)) : 0;

  return (
    <div
      className={cn(
        'relative sticky top-0 z-[60] border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2 font-medium">
            <span className={cn('h-2 w-2 rounded-full', statusColor)} />
            <span className="w-[5.5rem]">{statusLabel}</span>
            {isOffline ? (
              <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>

          <Badge
            variant={pendingOperations > 0 ? 'warning' : 'outline'}
            className="h-6 shrink-0 gap-1.5 px-2.5 font-medium"
          >
            Pendientes
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/20 px-1 text-[10px] font-bold">
              {pendingOperations}
            </span>
          </Badge>

          <span className="hidden min-w-[11rem] truncate text-muted-foreground md:inline">
            Última sync: {formatLastSync(lastSync)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isInstallable && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void promptInstall()}>
              <Upload className="h-3 w-3 mr-1" />
              Instalar aplicación
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            disabled={!isOnline || isSyncing || pendingOperations === 0}
            onClick={() => void startSync()}
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', isSyncing && 'animate-spin')} />
            Sincronizar ahora
          </Button>
        </div>
      </div>

      {showProgressBar && (
        <div className="pointer-events-none absolute inset-x-0 top-full z-10 border-b border-border/40 bg-muted/95 px-4 py-2 shadow-sm backdrop-blur">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Sincronizando registros...</span>
              <span className="w-12 text-right font-medium tabular-nums text-foreground">
                {syncTotal > 0 ? `${syncedCount}/${syncTotal}` : `${syncProgress}%`}
              </span>
            </div>
            <Progress value={syncProgress} className="h-1.5 [&>div]:transition-none" />
          </div>
        </div>
      )}
    </div>
  );
}
