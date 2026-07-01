import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { dashboardService, type DashboardFilters } from '@/services/reports.service';
import { geographyService } from '@/services/geography.service';
import { nnaService } from '@/services/nna.service';
import { downloadChartCsv } from '@/lib/chart-export';
import { Users, Activity, CloudOff, TrendingUp, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#103B73', '#F2811D', '#C8102E', '#2E7D32', '#F5B800', '#0891b2'];
const TICK = { fontSize: 9, fill: '#64748b' };
const CHART_H = 'h-[11rem]';

interface ChartCardProps {
  title: string;
  exportName: string;
  labelKey: string;
  valueKey: string;
  data: Array<Record<string, string | number>>;
  children: React.ReactNode;
}

function ChartCard({ title, exportName, labelKey, valueKey, data, children }: ChartCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
        <CardTitle className="text-xs font-semibold text-[#103B73]">{title}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px]"
          onClick={() => downloadChartCsv(exportName, ['Etiqueta', 'Total'], data, labelKey, valueKey)}
        >
          <Download className="h-3 w-3 mr-1" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className={`px-2 pb-3 pt-0 ${CHART_H}`}>
        {children}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useDemoAuth();
  const offlineCount = nnaService.getOfflineQueue().length;
  const [estadoId, setEstadoId] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const filters: DashboardFilters = useMemo(() => ({
    operativo_id: user?.current_operativo?.id,
    estado_id: estadoId ? Number(estadoId) : undefined,
    from: from || undefined,
    to: to || undefined,
  }), [user?.current_operativo?.id, estadoId, from, to]);

  const { data: estados = [] } = useQuery({
    queryKey: ['estados'],
    queryFn: () => geographyService.getEstados(),
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', filters],
    queryFn: () => dashboardService.getStats(filters),
  });

  const kpis = stats?.kpis;

  const handlePanelExport = async (format: 'pdf' | 'csv') => {
    setExporting(format);
    try {
      await dashboardService.exportPanel(format, filters);
      toast.success(format === 'pdf' ? 'Panel PDF descargado' : 'Panel Excel (CSV) descargado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExporting(null);
    }
  };

  const clearFilters = () => {
    setEstadoId('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#103B73]">Panel ejecutivo</h1>
          <p className="text-xs text-muted-foreground">
            {user?.current_operativo?.name ?? 'Vista nacional'} — indicadores en tiempo real
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={exporting !== null}
            onClick={() => void handlePanelExport('csv')}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            {exporting === 'csv' ? 'Exportando…' : 'Excel panel'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={exporting !== null}
            onClick={() => void handlePanelExport('pdf')}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {exporting === 'pdf' ? 'Exportando…' : 'PDF panel'}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={estadoId || '__all__'} onValueChange={(v) => setEstadoId(v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los estados</SelectItem>
                  {estados.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs" htmlFor="filter-from">Desde</Label>
              <Input id="filter-from" type="date" className="h-8 text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs" htmlFor="filter-to">Hasta</Label>
              <Input id="filter-to" type="date" className="h-8 text-xs" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total NNA"
          value={isLoading ? '…' : kpis?.total ?? 0}
          icon={Users}
          variant="navy"
          compact
        />
        <KpiCard
          title="Registros hoy"
          value={isLoading ? '…' : kpis?.today ?? 0}
          icon={TrendingUp}
          variant="orange"
          compact
        />
        <KpiCard
          title="Pendientes sync"
          value={offlineCount}
          icon={CloudOff}
          variant="danger"
          compact
        />
        <KpiCard
          title="Operativo"
          value={user?.current_operativo?.code ?? '—'}
          icon={Activity}
          variant="teal"
          compact
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Por estado"
          exportName="nna-por-estado"
          labelKey="name"
          valueKey="total"
          data={stats?.by_estado ?? []}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.by_estado ?? []} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={TICK} interval={0} angle={-25} textAnchor="end" height={42} />
              <YAxis tick={TICK} width={28} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" fill="#103B73" radius={[2, 2, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Por género"
          exportName="nna-por-genero"
          labelKey="name"
          valueKey="total"
          data={stats?.by_gender ?? []}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats?.by_gender ?? []}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={52}
                label={({ value }) => value}
                labelLine={false}
              >
                {(stats?.by_gender ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Por lugar"
          exportName="nna-por-lugar"
          labelKey="name"
          valueKey="total"
          data={stats?.by_lugar ?? []}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.by_lugar ?? []} layout="vertical" margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={TICK} />
              <YAxis dataKey="name" type="category" width={72} tick={TICK} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" fill="#F2811D" radius={[0, 2, 2, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Evolución (30 días)"
          exportName="nna-evolucion"
          labelKey="date"
          valueKey="total"
          data={stats?.timeline ?? []}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.timeline ?? []} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={TICK} />
              <YAxis tick={TICK} width={28} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Por grupo de edad"
          exportName="nna-por-edad"
          labelKey="group"
          valueKey="total"
          data={stats?.by_age_group ?? []}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.by_age_group ?? []} layout="vertical" margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={TICK} />
              <YAxis dataKey="group" type="category" width={44} tick={TICK} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" fill="#16a34a" radius={[0, 2, 2, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top registradores"
          exportName="nna-productividad"
          labelKey="name"
          valueKey="total"
          data={stats?.productivity_by_user ?? []}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.productivity_by_user ?? []} layout="vertical" margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={TICK} />
              <YAxis dataKey="name" type="category" width={80} tick={TICK} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" fill="#0891b2" radius={[0, 2, 2, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
