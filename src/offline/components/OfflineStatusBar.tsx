import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

function useSyncProgressListeners() {
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

        toast({ variant: 'success', title: 'Sincronización completada', description });
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
        showSyncToast(detail?.synced ?? 0, detail?.failed ?? 0);
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

  const syncedCount =
    syncTotal > 0 ? Math.min(syncTotal, Math.round((syncProgress / 100) * syncTotal)) : 0;

  return { showProgressBar, syncProgress, syncTotal, syncedCount };
}

function SyncProgressBar({
  show,
  syncProgress,
  syncTotal,
  syncedCount,
}: {
  show: boolean;
  syncProgress: number;
  syncTotal: number;
  syncedCount: number;
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 overflow-hidden bg-muted/40">
      <div
        className="h-full bg-[#103B73] transition-[width] duration-200 ease-out"
        style={{ width: `${syncProgress}%` }}
      />
      <span className="sr-only">
        Sincronizando {syncTotal > 0 ? `${syncedCount}/${syncTotal}` : `${syncProgress}%`}
      </span>
    </div>
  );
}

export function OfflineHeaderControls({ className }: { className?: string }) {
  const { isOnline, isOffline, isSyncing, lastSync, pendingOperations, startSync } = useOffline();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const { showProgressBar, syncProgress, syncTotal, syncedCount } = useSyncProgressListeners();

  const statusLabel = isSyncing ? 'Sincronizando' : isOnline ? 'En línea' : 'Sin conexión';
  const statusColor = isSyncing ? 'bg-amber-500' : isOnline ? 'bg-emerald-500' : 'bg-red-500';
  const canSync = isOnline && !isSyncing && pendingOperations > 0;

  const handleSync = () => void startSync();

  return (
    <div className={cn('relative min-w-0', className)}>
      {/* ——— Mobile: chip + icon sync ——— */}
      <div className="flex items-center justify-end gap-1.5 lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex h-8 max-w-[9.5rem] items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                pendingOperations > 0
                  ? 'border-amber-300/80 bg-amber-50 text-amber-900'
                  : 'border-border/60 bg-muted/50 text-muted-foreground',
              )}
              aria-label="Estado de conexión y sincronización"
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusColor)} />
              <span className="truncate">{isSyncing ? 'Sync…' : isOnline ? 'En línea' : 'Offline'}</span>
              {pendingOperations > 0 && (
                <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0 text-[10px] font-bold text-white">
                  {pendingOperations}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Estado del sistema
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-sm">
              {isOffline ? (
                <CloudOff className="mr-2 h-4 w-4 text-red-500" />
              ) : (
                <Cloud className="mr-2 h-4 w-4 text-emerald-600" />
              )}
              {statusLabel}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-sm">
              Pendientes: <span className="ml-1 font-semibold">{pendingOperations}</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Última sync: {formatLastSync(lastSync)}
            </DropdownMenuItem>
            {isInstallable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void promptInstall()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Instalar aplicación
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          size="icon"
          variant={canSync ? 'default' : 'outline'}
          className={cn(
            'h-8 w-8 shrink-0 rounded-full',
            canSync && 'bg-[#103B73] hover:bg-[#0d3260] text-white',
          )}
          disabled={!canSync}
          onClick={handleSync}
          aria-label="Sincronizar ahora"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
        </Button>
      </div>

      {/* ——— Desktop: barra completa ——— */}
      <div className="hidden min-w-0 flex-1 items-center justify-between gap-3 text-xs lg:flex">
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

          <span className="hidden min-w-[11rem] truncate text-muted-foreground xl:inline">
            Última sync: {formatLastSync(lastSync)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isInstallable && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => void promptInstall()}
            >
              <Upload className="mr-1 h-3 w-3" />
              Instalar aplicación
            </Button>
          )}

          <Button
            size="sm"
            className="h-7 bg-[#103B73] text-xs text-white hover:bg-[#0d3260]"
            disabled={!canSync}
            onClick={handleSync}
          >
            <RefreshCw className={cn('mr-1 h-3 w-3', isSyncing && 'animate-spin')} />
            Sincronizar ahora
          </Button>
        </div>
      </div>

      <SyncProgressBar
        show={showProgressBar}
        syncProgress={syncProgress}
        syncTotal={syncTotal}
        syncedCount={syncedCount}
      />
    </div>
  );
}

/** @deprecated Usar OfflineHeaderControls dentro del header principal */
export function OfflineStatusBar({ className }: { className?: string }) {
  return <OfflineHeaderControls className={className} />;
}
