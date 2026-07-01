import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/custom-button';
import { reportsService } from '@/services/reports.service';
import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { FileSpreadsheet, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const { user } = useDemoAuth();
  const operativoId = user?.current_operativo?.id;

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    try {
      await reportsService.export(format, operativoId);
      toast.success(`Exportación ${format.toUpperCase()} iniciada`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Reportes y exportación</h1>
        <p className="text-muted-foreground">Descarga registros NNA en múltiples formatos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Excel</CardTitle></CardHeader>
          <CardContent>
            <CustomButton className="w-full" onClick={() => handleExport('xlsx')} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
              Descargar .xlsx
            </CustomButton>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">CSV</CardTitle></CardHeader>
          <CardContent>
            <CustomButton variant="outline" className="w-full" onClick={() => handleExport('csv')} leftIcon={<Download className="h-4 w-4" />}>
              Descargar .csv
            </CustomButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
