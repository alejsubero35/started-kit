import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  Users,
  TrendingUp,
  CloudOff,
  FileSpreadsheet,
  Download,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { DataTableView } from '@/components/data-table/DataTableView';
import { useDataTableQuery } from '@/components/data-table/useDataTableQuery';
import type { DataTableColumn } from '@/components/data-table/types';
import { CustomButton } from '@/components/ui/custom-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { nnaService, type NnaListItem } from '@/services/nna.service';
import { dashboardService, reportsService } from '@/services/reports.service';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function NnaListPage() {
  const { user } = useDemoAuth();
  const operativoId = user?.current_operativo?.id;
  const offlineCount = nnaService.getOfflineQueue().length;
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);

  const table = useDataTableQuery<NnaListItem>({
    queryKey: ['nna', operativoId],
    fetchFn: (params) =>
      nnaService.listPaginated({
        ...params,
        operativo_id: operativoId,
      }),
    initialPageSize: 25,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', operativoId],
    queryFn: () => dashboardService.getStats(operativoId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => nnaService.delete(id),
    onSuccess: () => {
      toast.success('Registro eliminado');
      void table.refetch();
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar'),
  });

  useEffect(() => {
    const sync = async () => {
      const count = await nnaService.flushOfflineQueue();
      if (count > 0) {
        toast.success(`${count} registro(s) sincronizado(s)`);
        void table.refetch();
      }
    };
    window.addEventListener('online', sync);
    void sync();
    return () => window.removeEventListener('online', sync);
  }, [table.refetch]);

  const kpis = stats?.kpis;

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(format);
    const toastId = toast.loading('Preparando exportación…');
    try {
      await reportsService.export(format, operativoId, (message) => {
        toast.loading(message, { id: toastId });
      });
      toast.success(`Exportación ${format.toUpperCase()} completada`, { id: toastId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar', { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = useCallback(
    (item: NnaListItem) => {
      const name = item.full_name ?? `${item.first_name} ${item.last_name}`;
      if (!window.confirm(`¿Eliminar el registro de ${name}?`)) return;
      deleteMutation.mutate(item.id);
    },
    [deleteMutation],
  );

  const columns = useMemo<Array<DataTableColumn<NnaListItem>>>(
    () => [
      {
        id: 'full_name',
        header: 'Nombre completo',
        cell: ({ item }) => (
          <span className="font-medium">
            {item.full_name ?? `${item.first_name} ${item.last_name}`}
          </span>
        ),
      },
      {
        id: 'age_years',
        header: 'Edad',
        cell: ({ item }) =>
          item.age_years != null ? `${item.age_years} años` : '—',
        hideBelow: 'sm',
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ item }) => (
          <Badge variant="outline" className="whitespace-nowrap">
            {item.status_label ?? item.status ?? '—'}
          </Badge>
        ),
      },
      {
        id: 'registered_at',
        header: 'Registrado',
        cell: ({ item }) => formatDate(item.registered_at),
        hideBelow: 'lg',
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ item }) => (
          <div className="flex items-center gap-1.5">
            <Link
              to={`/nna/${item.id}/edit`}
              aria-label="Editar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white transition-opacity hover:opacity-70"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(item)}
              disabled={deleteMutation.isPending}
              aria-label="Eliminar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white transition-opacity hover:opacity-70 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        headerClassName: 'w-[100px]',
      },
    ],
    [deleteMutation.isPending, handleDelete],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#103B73]">Registro NNA</h1>
          <p className="text-muted-foreground">Niños, niñas y adolescentes registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CustomButton
            variant="outline"
            onClick={() => void table.refetch()}
            leftIcon={<RefreshCw className={cn('h-4 w-4', table.isFetching && 'animate-spin')} />}
          >
            Actualizar
          </CustomButton>
          <Link to="/nna/new">
            <CustomButton leftIcon={<Plus className="h-4 w-4" />}>Nuevo registro</CustomButton>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total NNA"
          value={statsLoading ? '…' : (kpis?.total ?? table.total)}
          icon={Users}
          variant="navy"
        />
        <KpiCard
          title="Registros hoy"
          value={statsLoading ? '…' : (kpis?.today ?? 0)}
          icon={TrendingUp}
          variant="orange"
        />
        <KpiCard
          title="Pendientes sync"
          value={offlineCount}
          icon={CloudOff}
          variant="danger"
        />
        <KpiCard
          title="Sincronizados"
          value={statsLoading ? '…' : (kpis?.synced ?? 0)}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descargar reportes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <CustomButton
            variant="outline"
            disabled={exporting !== null}
            onClick={() => void handleExport('xlsx')}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            {exporting === 'xlsx' ? 'Exportando…' : 'Excel (.xlsx)'}
          </CustomButton>
          <CustomButton
            variant="outline"
            disabled={exporting !== null}
            onClick={() => void handleExport('csv')}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {exporting === 'csv' ? 'Exportando…' : 'CSV'}
          </CustomButton>
        </CardContent>
      </Card>

      {offlineCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm">
            {offlineCount} registro(s) pendientes de sincronización offline
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <DataTableView
            items={table.items}
            columns={columns}
            rowKey={({ item }) => String(item.id)}
            loading={table.isLoading || table.isFetching}
            error={table.error instanceof Error ? table.error.message : null}
            toolbar={{
              search: {
                value: table.search,
                onChange: table.setSearch,
                placeholder: 'Buscar por nombre…',
              },
            }}
            pagination={{
              ...table.pagination,
              pageSizeOptions: [10, 25, 50, 100],
            }}
            emptyState={{
              title: 'No hay registros',
              description: 'Cree el primer registro NNA para comenzar.',
              action: {
                label: 'Nuevo registro',
                onClick: () => {
                  window.location.assign('/nna/new');
                },
              },
            }}
            wrapInCard={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
