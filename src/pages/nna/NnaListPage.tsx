import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { nnaService } from '@/services/nna.service';
import { dashboardService, reportsService } from '@/services/reports.service';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { CustomButton } from '@/components/ui/custom-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Users, TrendingUp, CloudOff, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function NnaListPage() {
  const { user } = useDemoAuth();
  const operativoId = user?.current_operativo?.id;
  const offlineCount = nnaService.getOfflineQueue().length;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['nna'],
    queryFn: () => nnaService.list(),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', operativoId],
    queryFn: () => dashboardService.getStats(operativoId),
  });

  useEffect(() => {
    const sync = async () => {
      const count = await nnaService.flushOfflineQueue();
      if (count > 0) {
        toast.success(`${count} registro(s) sincronizado(s)`);
        refetch();
      }
    };
    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, [refetch]);

  const records = (data as { data?: Array<Record<string, unknown>> })?.data ?? [];
  const kpis = stats?.kpis;

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    try {
      await reportsService.export(format, operativoId);
      toast.success(`Descarga ${format.toUpperCase()} iniciada`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#103B73]">Registro NNA</h1>
          <p className="text-muted-foreground">Niños, niñas y adolescentes registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CustomButton variant="outline" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Actualizar
          </CustomButton>
          <Link to="/nna/new">
            <CustomButton leftIcon={<Plus className="h-4 w-4" />}>Nuevo registro</CustomButton>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total NNA</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '…' : kpis?.total ?? records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registros hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '…' : kpis?.today ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes sync</CardTitle>
            <CloudOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sincronizados</CardTitle>
            <Badge variant="outline">{statsLoading ? '…' : kpis?.synced ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '…' : kpis?.synced ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descargar reportes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <CustomButton variant="outline" onClick={() => void handleExport('xlsx')} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
            Excel (.xlsx)
          </CustomButton>
          <CustomButton variant="outline" onClick={() => void handleExport('csv')} leftIcon={<Download className="h-4 w-4" />}>
            CSV
          </CustomButton>
          <CustomButton variant="outline" onClick={() => void handleExport('pdf')} leftIcon={<FileText className="h-4 w-4" />}>
            PDF
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

      {isLoading ? (
        <p>Cargando registros...</p>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay registros. <Link to="/nna/new" className="text-[#103B73] underline font-medium">Crear el primero</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((r: Record<string, unknown>) => (
            <Card key={String(r.id)}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{String(r.full_name ?? `${r.first_name} ${r.last_name}`)}</CardTitle>
                  <Badge variant="outline">{String(r.status_label ?? r.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {r.age_years != null && <span>Edad: {String(r.age_years)} años</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
