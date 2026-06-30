import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogsService } from '@/services/catalogs.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

export default function CatalogsPage() {
  const { data: types = [], isLoading } = useQuery({
    queryKey: ['catalog-types'],
    queryFn: () => catalogsService.getTypes(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogos</h1>
        <p className="text-muted-foreground">Administración de catálogos del sistema</p>
      </div>

      {isLoading ? (
        <p>Cargando catálogos...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => (
            <Link key={type.value} to={`/catalogs/${type.value}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    {type.label}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{type.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
