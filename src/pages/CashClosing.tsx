// Sistema Lojista - Cash Closing Page

import { useState, useEffect, useCallback } from 'react';
import { Download, Printer, ArrowLeft, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { useCashSessions } from '@/hooks/useCashSessions';
import { Transaction } from '@/types';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import * as XLSX from 'xlsx';

const CashClosing = () => {
  const { currentSession, saveSession } = useCashSessions();
  const { transactions } = useTransactions();
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [dailySummary, setDailySummary] = useState({
    totalSales: 0,
    totalEntries: 0,
    totalExits: 0,
    totalExpenses: 0,
    salesCount: 0,
    finalAmount: 0,
    averageTicket: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config: receiptConfig } = useReceiptConfig();

  const loadCashData = useCallback(() => {
    if (!currentSession?.id) {
      setTodayTransactions([]);
      setDailySummary({
        totalSales: 0,
        totalEntries: 0,
        totalExits: 0,
        totalExpenses: 0,
        salesCount: 0,
        finalAmount: currentSession?.initialAmount ?? 0,
        averageTicket: 0
      });
      return;
    }

    const sessionTransactions = transactions.filter(
      (t) => t.sessionId === currentSession.id
    );

    setTodayTransactions(sessionTransactions);

    // Calculate summary
    const summary = sessionTransactions.reduce((acc, transaction) => {
      switch (transaction.type) {
        case 'venda':
          acc.totalSales += transaction.total;
          acc.salesCount++;
          break;
        case 'entrada':
          acc.totalEntries += transaction.total;
          break;
        case 'saida':
          acc.totalExits += transaction.total;
          break;
        case 'despesa':
          acc.totalExpenses += transaction.total;
          break;
      }
      return acc;
    }, { totalSales: 0, totalEntries: 0, totalExits: 0, totalExpenses: 0, salesCount: 0 });

    const initialAmount = currentSession.initialAmount ?? 0;
    const finalAmount = initialAmount + summary.totalSales + summary.totalEntries - summary.totalExits - summary.totalExpenses;
    const averageTicket = summary.salesCount > 0 ? summary.totalSales / summary.salesCount : 0;

    setDailySummary({
      ...summary,
      finalAmount,
      averageTicket
    });
  }, [currentSession, transactions]);

  useEffect(() => {
    loadCashData();
  }, [loadCashData]);

  const handleExportXLSX = () => {
    const wsData = [
      ['FECHAMENTO DE CAIXA - ' + format(new Date(), 'dd/MM/yyyy')],
      [''],
      ['RESUMO DO DIA'],
      ['Valor Inicial', 'R$ ' + (currentSession?.initialAmount || 0).toFixed(2)],
      ['Total de Vendas', 'R$ ' + dailySummary.totalSales.toFixed(2)],
      ['Total de Entradas', 'R$ ' + dailySummary.totalEntries.toFixed(2)],
      ['Total de Saídas', 'R$ ' + dailySummary.totalExits.toFixed(2)],
      ['Total de Despesas', 'R$ ' + dailySummary.totalExpenses.toFixed(2)],
      ['Valor Final', 'R$ ' + dailySummary.finalAmount.toFixed(2)],
      ['Quantidade de Vendas', dailySummary.salesCount],
      ['Ticket Médio', 'R$ ' + dailySummary.averageTicket.toFixed(2)],
      [''],
      ['TRANSAÇÕES DO DIA'],
      ['Hora', 'Tipo', 'Descrição', 'Valor', 'Forma de Pagamento']
    ];

    todayTransactions.forEach(t => {
      wsData.push([
        format(new Date(t.createdAt), 'HH:mm'),
        t.type.charAt(0).toUpperCase() + t.type.slice(1),
        t.description,
        'R$ ' + t.total.toFixed(2),
        t.paymentMethod || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fechamento');
    
    const fileName = `fechamento_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Exportação realizada",
      description: "Arquivo XLSX baixado com sucesso.",
    });
  };

  const handlePrint = () => {
    const storeName = (receiptConfig.nomeLoja || 'Sistema Lojista').trim() || 'Sistema Lojista';
    const storePhone = receiptConfig.telefoneLoja ? receiptConfig.telefoneLoja.trim() : '';
    const storeAddress = receiptConfig.enderecoLoja
      ? receiptConfig.enderecoLoja
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join('<br/>')
      : '';

    const printContent = `
      <html>
        <head>
          <title>Fechamento de Caixa - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <style>
            @page { margin: 20px 30px 20px 20px; }
            body { font-family: Arial, sans-serif; margin: 20px; margin-right: 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 30px; }
            .summary table { width: 100%; border-collapse: collapse; }
            .summary th, .summary td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .summary th { background-color: #f2f2f2; }
            .transactions table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .transactions th, .transactions td { border: 1px solid #ddd; padding: 6px; }
            .transactions th { background-color: #f2f2f2; }
            .total-row { font-weight: bold; background-color: #e8f4f8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${storeName}</h1>
            ${storePhone ? `<p>Telefone: ${storePhone}</p>` : ''}
            ${storeAddress ? `<p>${storeAddress}</p>` : ''}
            <h2>Fechamento de Caixa</h2>
            <p>${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          
          <div class="summary">
            <h3>Resumo do Dia</h3>
            <table>
              <tr><td>Valor Inicial</td><td>R$ ${(currentSession?.initialAmount || 0).toFixed(2)}</td></tr>
              <tr><td>Total de Vendas</td><td>R$ ${dailySummary.totalSales.toFixed(2)}</td></tr>
              <tr><td>Total de Entradas</td><td>R$ ${dailySummary.totalEntries.toFixed(2)}</td></tr>
              <tr><td>Total de Saídas</td><td>R$ ${dailySummary.totalExits.toFixed(2)}</td></tr>
              <tr><td>Total de Despesas</td><td>R$ ${dailySummary.totalExpenses.toFixed(2)}</td></tr>
              <tr class="total-row"><td>Valor Final</td><td>R$ ${dailySummary.finalAmount.toFixed(2)}</td></tr>
              <tr><td>Quantidade de Vendas</td><td>${dailySummary.salesCount}</td></tr>
              <tr><td>Ticket Médio</td><td>R$ ${dailySummary.averageTicket.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="transactions">
            <h3>Transações do Dia</h3>
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                ${todayTransactions.map(t => `
                  <tr>
                    <td>${format(new Date(t.createdAt), 'HH:mm')}</td>
                    <td>${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
                    <td>${t.description}</td>
                    <td>R$ ${t.total.toFixed(2)}</td>
                    <td>${t.paymentMethod || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }

    toast({
      title: "Impressão iniciada",
      description: "Documento de fechamento enviado para impressão.",
    });
  };

  const handleConfirmClosing = async () => {
    if (currentSession) {
    const updatedSession = {
      ...currentSession,
      ...dailySummary,
      isOpen: false,
      isClosed: true,
      closedAt: new Date().toISOString()
    };
      
      await saveSession(updatedSession);
      
      toast({
        title: "Caixa fechado com sucesso",
        description: "O fechamento foi confirmado e registrado.",
      });
      
      navigate('/');
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold text-primary truncate">Fechamento de Caixa</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      </div>

      {/* Session Info */}
      {currentSession && (
        <Card className="hs-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Seção Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium">{currentSession.date.split('-').reverse().join('/')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor Inicial</p>
                <p className="font-medium">R$ {currentSession.initialAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Summary */}
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Resumo das Vendas do Dia</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="text-center p-2 sm:p-4 bg-emerald-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">R$ {dailySummary.totalSales.toFixed(2)}</p>
              <p className="text-xs sm:text-sm text-emerald-700">Vendas</p>
            </div>
            <div className="text-center p-2 sm:p-4 bg-blue-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">R$ {dailySummary.totalEntries.toFixed(2)}</p>
              <p className="text-xs sm:text-sm text-blue-700">Entradas</p>
            </div>
            <div className="text-center p-2 sm:p-4 bg-orange-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-orange-600 truncate">R$ {dailySummary.totalExits.toFixed(2)}</p>
              <p className="text-xs sm:text-sm text-orange-700">Saídas</p>
            </div>
            <div className="text-center p-2 sm:p-4 bg-red-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">R$ {dailySummary.totalExpenses.toFixed(2)}</p>
              <p className="text-xs sm:text-sm text-red-700">Despesas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-primary/5 rounded-lg">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Valor Final</p>
              <p className="text-lg sm:text-2xl font-bold text-primary truncate">R$ {dailySummary.finalAmount.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Vendas Realizadas</p>
              <p className="text-lg sm:text-2xl font-bold">{dailySummary.salesCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-lg sm:text-2xl font-bold truncate">R$ {dailySummary.averageTicket.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleExportXLSX}
          variant="outline"
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Exportar XLSX</span>
          <span className="sm:hidden">Export</span>
        </Button>
        <Button
          onClick={handlePrint}
          variant="secondary"
          className="flex-1"
        >
          <Printer className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Imprimir Relatório</span>
          <span className="sm:hidden">Imprimir</span>
        </Button>
        <Button
          onClick={handleConfirmClosing}
          variant="default"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Confirmar Fechamento</span>
          <span className="sm:hidden">Confirmar</span>
        </Button>
      </div>
    </div>
  );
};

export default CashClosing;