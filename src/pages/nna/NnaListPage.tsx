import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { nnaService } from '@/services/nna.service';
import { CustomButton } from '@/components/ui/custom-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function NnaListPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['nna'],
    queryFn: () => nnaService.list(),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Registro NNA</h1>
          <p className="text-muted-foreground">Niños, niñas y adolescentes registrados</p>
        </div>
        <div className="flex gap-2">
          <CustomButton variant="outline" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Actualizar
          </CustomButton>
          <Link to="/nna/new">
            <CustomButton leftIcon={<Plus className="h-4 w-4" />}>Nuevo registro</CustomButton>
          </Link>
        </div>
      </div>

      {nnaService.getOfflineQueue().length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm">
            {nnaService.getOfflineQueue().length} registro(s) pendientes de sincronización offline
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Cargando registros...</p>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay registros. <Link to="/nna/new" className="text-primary underline">Crear el primero</Link>
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
