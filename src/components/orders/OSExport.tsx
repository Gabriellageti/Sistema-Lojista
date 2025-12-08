import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ServiceOrder } from '@/types';
import { exportOrdersToCSV, generateOrdersReport } from '@/utils/exportUtils';
import { format } from 'date-fns';

interface OSExportProps {
  orders: ServiceOrder[];
  isFiltered?: boolean;
}

export default function OSExport({ orders, isFiltered = false }: OSExportProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCSVExport = () => {
    const filename = isFiltered 
      ? `os-filtradas-${format(new Date(), 'yyyy-MM-dd')}.csv`
      : `ordens-servico-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    exportOrdersToCSV(orders, filename);
    setIsOpen(false);
  };

  const handleReportExport = () => {
    const report = generateOrdersReport(orders);
    
    // Create a simple report text
    const reportText = `
RELATÓRIO DE ORDENS DE SERVIÇO
Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
${isFiltered ? '(Dados filtrados)' : '(Todos os dados)'}

RESUMO GERAL:
- Total de OS: ${report.totalOrders}
- OS em Andamento: ${report.openOrders}
- OS Concluídas: ${report.completedOrders}
- OS Canceladas: ${report.cancelledOrders}

VALORES:
- Valor Total: R$ ${report.totalValue.toFixed(2)}
- Valor em Aberto: R$ ${report.openValue.toFixed(2)}
- Valor Concluído: R$ ${report.completedValue.toFixed(2)}
- Valor Médio por OS: R$ ${report.averageValue.toFixed(2)}

FORMAS DE PAGAMENTO:
${Object.entries(report.paymentMethodBreakdown)
  .map(([method, count]) => `- ${method}: ${count} OS`)
  .join('\n')}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-os-${format(new Date(), 'yyyy-MM-dd')}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsOpen(false);
  };

  if (orders.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar ({orders.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Exportar Dados</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {isFiltered 
                ? `Exportando ${orders.length} ordem(ns) de serviço filtrada(s)`
                : `Exportando todas as ${orders.length} ordem(ns) de serviço`
              }
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleCSVExport}
            >
              <FileSpreadsheet className="w-4 h-4 mr-3" />
              Exportar como CSV
              <span className="text-xs text-muted-foreground ml-auto">Excel</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleReportExport}
            >
              <FileText className="w-4 h-4 mr-3" />
              Relatório Resumido
              <span className="text-xs text-muted-foreground ml-auto">TXT</span>
            </Button>
          </div>
          
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Os dados exportados respeitam os filtros aplicados atualmente.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}