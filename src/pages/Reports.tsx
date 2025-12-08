// Help Smart - Reports Page

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, BarChart3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsServiceWithHooks, ReportFilters } from '@/services/AnalyticsServiceWithHooks';
import { insightsService } from '@/services/InsightsService';
import { useTransactions } from '@/hooks/useTransactions';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { useCreditSales } from '@/hooks/useCreditSales';
import { KPICard } from '@/components/reports/KPICard';
import { InsightsCard } from '@/components/reports/InsightsCard';
import { RevenueChart } from '@/components/reports/RevenueChart';
import { PaymentMethodsChart } from '@/components/reports/PaymentMethodsChart';
import { TopDescriptionsChart } from '@/components/reports/TopDescriptionsChart';
import { OrdersFunnelChart } from '@/components/reports/OrdersFunnelChart';
import { ReportFilters as ReportFiltersComponent } from '@/components/reports/ReportFilters';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Reports = () => {
  const { transactions } = useTransactions();
  const { orders } = useServiceOrders();
  const { creditSales } = useCreditSales();
  const [filters, setFilters] = useState<ReportFilters>(analyticsServiceWithHooks.getDefaultFilters());
  const { toast } = useToast();

  // Debounced filters to avoid excessive recalculations
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 150);

    return () => clearTimeout(timer);
  }, [filters]);

  // Generate analytics report
  const reportData = useMemo(() => {
    return analyticsServiceWithHooks.generateReport(
      debouncedFilters,
      transactions,
      orders,
      creditSales,
    );
  }, [debouncedFilters, transactions, orders, creditSales]);

  // Generate insights
  const insights = useMemo(() => {
    return insightsService.generateInsights(reportData);
  }, [reportData]);

  // Get predefined periods
  const predefinedPeriods = analyticsServiceWithHooks.getPredefinedPeriods();

  const exportChartAsPNG = async (elementId: string, filename: string) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        toast({
          title: "Erro",
          description: "Elemento do gráfico não encontrado.",
          variant: "destructive"
        });
        return;
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        allowTaint: true,
        useCORS: true
      });

      const link = document.createElement('a');
      link.download = `${filename}-${format(new Date(), 'dd-MM-yyyy')}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Gráfico exportado",
        description: "A imagem PNG foi baixada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao exportar gráfico:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o gráfico.",
        variant: "destructive"
      });
    }
  };

  const exportCSV = () => {
    const { current } = reportData;
    
    const csvContent = [
      ['Relatório Help Smart - Análise Executiva'],
      [`Período: ${format(new Date(filters.startDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(filters.endDate), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['RESUMO FINANCEIRO'],
      ['Receita (Vendas)', `R$ ${current.revenue.toFixed(2)}`],
      ['Entradas', `R$ ${current.entries.toFixed(2)}`],
      ['Saídas', `R$ ${current.exits.toFixed(2)}`],
      ['Despesas', `R$ ${current.expenses.toFixed(2)}`],
      ['Resultado', `R$ ${current.result.toFixed(2)}`],
      ['Ticket Médio', `R$ ${current.averageTicket.toFixed(2)}`],
      ['Total de Vendas', current.salesCount.toString()],
      [''],
      ['ORDENS DE SERVIÇO'],
      ['Abertas', current.ordersFunnel.open.toString()],
      ['Concluídas', current.ordersFunnel.completed.toString()],
      ['Canceladas', current.ordersFunnel.cancelled.toString()],
      ['Taxa de Conversão', `${current.conversionRate.toFixed(1)}%`],
      [''],
      ['FORMAS DE PAGAMENTO'],
      ...Object.entries(current.paymentMethods).map(([method, value]) => [getPaymentLabel(method), `R$ ${value.toFixed(2)}`]),
      [''],
      ['TOP PRODUTOS/SERVIÇOS'],
      ['Descrição', 'Quantidade', 'Total'],
      ...current.topDescriptions.map(item => [item.description, item.count.toString(), `R$ ${item.total.toFixed(2)}`])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-help-smart-${filters.startDate}-${filters.endDate}.csv`;
    link.click();

    toast({
      title: "Relatório exportado",
      description: "O arquivo CSV foi baixado com sucesso.",
    });
  };

  const getPaymentLabel = (payment: string) => {
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_debito: 'Cartão Débito',
      cartao_credito: 'Cartão Crédito',
      outros: 'Outros',
    };
    return labels[payment] || payment;
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const exportReportAsPDF = async () => {
    try {
      const reportContainer = document.getElementById('reports-container');
      if (!reportContainer) {
        toast({
          title: "Erro",
          description: "Conteúdo do relatório não encontrado.",
          variant: "destructive"
        });
        return;
      }

      // Scroll to top to ensure everything is visible
      window.scrollTo(0, 0);
      
      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportContainer, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        allowTaint: true,
        useCORS: true,
        width: reportContainer.scrollWidth,
        height: reportContainer.scrollHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `relatorio-help-smart-${format(new Date(), 'dd-MM-yyyy-HHmm')}.pdf`;
      pdf.save(filename);

      toast({
        title: "Relatório exportado",
        description: "O arquivo PDF foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Relatórios Analíticos
          </h1>
          <p className="text-muted-foreground">
            Visão executiva com insights automáticos e comparação de períodos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={exportCSV}
            variant="secondary"
            size="lg"
            className="min-w-[140px]"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button 
            onClick={exportReportAsPDF}
            variant="hero"
            size="lg"
            className="min-w-[140px]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Report Container - for PDF export */}
      <div id="reports-container">
        {/* Filters */}
        <ReportFiltersComponent
          filters={filters}
          onChange={setFilters}
          predefinedPeriods={predefinedPeriods}
        />

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <KPICard
          title="Receita (Vendas)"
          value={formatCurrency(reportData.current.revenue)}
          delta={reportData.deltas.revenue}
          deltaLabel="período anterior"
          icon={<DollarSign className="w-8 h-8 text-emerald-600" />}
          tooltip="Soma total de todas as vendas no período selecionado"
        />
        
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(reportData.current.averageTicket)}
          delta={reportData.deltas.averageTicket}
          deltaLabel="período anterior"
          icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
          tooltip="Valor médio por venda (Receita ÷ Número de vendas)"
        />
        
        <KPICard
          title="Taxa de Conversão OS"
          value={`${reportData.current.conversionRate.toFixed(1)}%`}
          delta={reportData.deltas.conversionRate}
          deltaLabel="período anterior"
          icon={<BarChart3 className="w-8 h-8 text-purple-600" />}
          tooltip="Percentual de ordens de serviço concluídas (Concluídas ÷ Total)"
        />
        
        <KPICard
          title="Resultado"
          value={formatCurrency(reportData.current.result)}
          delta={reportData.deltas.result}
          deltaLabel="período anterior"
          icon={<TrendingUp className={`w-8 h-8 ${reportData.current.result >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />}
          tooltip="Receita + Entradas - Saídas - Despesas"
          className={reportData.current.result >= 0 ? '' : 'border-red-200/50'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="revenue-chart">
          <RevenueChart 
            data={reportData.current.dailyRevenue.map(day => ({
              date: day.date,
              current: day.revenue,
              previous: 0
            }))}
            onExport={() => exportChartAsPNG('revenue-chart', 'grafico-receita')}
          />
        </div>
        
        <div id="payment-methods-chart">
          <PaymentMethodsChart 
            data={reportData.current.paymentMethods}
            onExport={() => exportChartAsPNG('payment-methods-chart', 'grafico-formas-pagamento')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="top-descriptions-chart">
          <TopDescriptionsChart 
            data={reportData.current.topDescriptions}
            onExport={() => exportChartAsPNG('top-descriptions-chart', 'grafico-top-servicos')}
          />
        </div>
        
        <div id="orders-funnel-chart">
          <OrdersFunnelChart 
            data={reportData.current.ordersFunnel}
            onExport={() => exportChartAsPNG('orders-funnel-chart', 'grafico-funil-os')}
          />
        </div>
      </div>

      {/* Insights Section */}
      <InsightsCard insights={insights} />

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Table */}
        <Card className="hs-card">
          <CardHeader>
            <CardTitle>Resumo por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(reportData.current.paymentMethods)
                .filter(([, value]) => value > 0)
                .sort(([,a], [,b]) => b - a)
                .map(([method, value]) => {
                  const percentage = reportData.current.revenue > 0 
                    ? (value / Object.values(reportData.current.paymentMethods).reduce((sum, v) => sum + v, 0)) * 100 
                    : 0;
                  
                  return (
                    <div key={method} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-medium">{getPaymentLabel(method)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <span className="font-bold">{formatCurrency(value)}</span>
                    </div>
                  );
                })}
              
              {Object.keys(reportData.current.paymentMethods).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma transação encontrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Summary Table */}
        <Card className="hs-card">
          <CardHeader>
            <CardTitle>Resumo de Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
                <span className="font-medium">Abertas</span>
                <span className="font-bold">{reportData.current.ordersFunnel.open}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/50">
                <span className="font-medium">Concluídas</span>
                <span className="font-bold">{reportData.current.ordersFunnel.completed}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-200/50">
                <span className="font-medium">Canceladas</span>
                <span className="font-bold">{reportData.current.ordersFunnel.cancelled}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg font-semibold">
                <span>Taxa de Conversão</span>
                <span className={reportData.current.conversionRate >= 70 ? 'text-emerald-600' : reportData.current.conversionRate >= 50 ? 'text-amber-600' : 'text-red-600'}>
                  {reportData.current.conversionRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default Reports;