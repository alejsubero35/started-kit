import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { operativosService } from '@/services/operativos.service';
import { nnaService } from '@/services/nna.service';
import { Users, MapPin, Activity, CloudOff } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useDemoAuth();
  const offlineCount = nnaService.getOfflineQueue().length;

  const { data: operativos = [] } = useQuery({
    queryKey: ['operativos', 'active'],
    queryFn: () => operativosService.list({ active_only: true }),
  });

  const operativoActivo = user?.current_operativo ?? operativos[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SIRP-NNA</h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.name}. Panel de operación en emergencias.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operativo activo</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{operativoActivo?.name ?? 'Sin operativo'}</div>
            <p className="text-xs text-muted-foreground">{operativoActivo?.code}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operativos activos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operativos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registros pendientes sync</CardTitle>
            <CloudOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offlineCount}</div>
            <p className="text-xs text-muted-foreground">En cola local offline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tu rol</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {Array.isArray(user?.roles) ? user.roles.join(', ') : '—'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
