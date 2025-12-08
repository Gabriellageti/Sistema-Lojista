// Help Smart - Cash Closure Details Component

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, DollarSign, FileText, Download, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTransactions } from '@/hooks/useTransactions';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { CashSession, Transaction } from '@/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCreditSales } from '@/hooks/useCreditSales';
import { filterSettledTransactions } from '@/utils/creditSalesUtils';

interface CashClosureDetailsProps {
  session: CashSession;
  onBack: () => void;
  deleteSession: (sessionId: string) => Promise<boolean>;
  restoreSession: (sessionId: string) => Promise<boolean>;
}

const CashClosureDetails = ({ session, onBack, deleteSession, restoreSession }: CashClosureDetailsProps) => {
  const [sessionTransactions, setSessionTransactions] = useState<Transaction[]>([]);
  const { transactions } = useTransactions();
  const { creditSales } = useCreditSales();
  const { config: receiptConfig } = useReceiptConfig();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canRestore = typeof restoreSession === 'function';

  useEffect(() => {
    if (!session?.id) {
      setSessionTransactions([]);
      return;
    }

    const filteredTransactions = filterSettledTransactions(transactions, creditSales).filter(
      (transaction) => transaction.sessionId === session.id
    );

    setSessionTransactions(filteredTransactions);
  }, [session, transactions, creditSales]);

  const sessionSummary = useMemo(() => {
    const totals = sessionTransactions.reduce(
      (acc, transaction) => {
        switch (transaction.type) {
          case 'venda':
            acc.totalSales += transaction.total;
            acc.salesCount += 1;
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
      },
      {
        totalSales: 0,
        totalEntries: 0,
        totalExits: 0,
        totalExpenses: 0,
        salesCount: 0,
      }
    );

    const initialAmount = session.initialAmount ?? 0;
    const finalAmount =
      initialAmount +
      totals.totalSales +
      totals.totalEntries -
      totals.totalExits -
      totals.totalExpenses;

    const averageTicket =
      totals.salesCount > 0 ? totals.totalSales / totals.salesCount : 0;

    return {
      ...totals,
      finalAmount,
      averageTicket,
    };
  }, [session.initialAmount, sessionTransactions]);

  const handleExportXLSX = () => {
    const wsData = [
      [`FECHAMENTO DE CAIXA - ${format(parseISO(session.date), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['RESUMO DO DIA'],
      ['Valor Inicial', `R$ ${session.initialAmount?.toFixed(2) || '0,00'}`],
      ['Total de Vendas', `R$ ${sessionSummary.totalSales.toFixed(2)}`],
      ['Total de Entradas', `R$ ${sessionSummary.totalEntries.toFixed(2)}`],
      ['Total de Saídas', `R$ ${sessionSummary.totalExits.toFixed(2)}`],
      ['Total de Despesas', `R$ ${sessionSummary.totalExpenses.toFixed(2)}`],
      ['Valor Final', `R$ ${sessionSummary.finalAmount.toFixed(2)}`],
      ['Quantidade de Vendas', sessionSummary.salesCount],
      ['Ticket Médio', `R$ ${sessionSummary.averageTicket.toFixed(2)}`],
      [''],
      ['TRANSAÇÕES DO DIA'],
      ['Hora', 'Tipo', 'Descrição', 'Valor', 'Forma de Pagamento']
    ];

    sessionTransactions.forEach(t => {
      wsData.push([
        format(new Date(t.createdAt), 'HH:mm'),
        t.type.charAt(0).toUpperCase() + t.type.slice(1),
        t.description,
        `R$ ${t.total.toFixed(2)}`,
        t.paymentMethod || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fechamento');
    
    const fileName = `fechamento_${format(parseISO(session.date), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Exportação realizada",
      description: "Arquivo XLSX baixado com sucesso.",
    });
  };

  const handlePrint = () => {
    const storeName = (receiptConfig.nomeLoja || 'Help Smart').trim() || 'Help Smart';
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
          <title>Fechamento de Caixa - ${format(parseISO(session.date), 'dd/MM/yyyy', { locale: ptBR })}</title>
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
            <p>${format(parseISO(session.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
          </div>
          
          <div class="summary">
            <h3>Resumo do Dia</h3>
            <table>
              <tr><td>Valor Inicial</td><td>R$ ${session.initialAmount?.toFixed(2) || '0,00'}</td></tr>
              <tr><td>Total de Vendas</td><td>R$ ${sessionSummary.totalSales.toFixed(2)}</td></tr>
              <tr><td>Total de Entradas</td><td>R$ ${sessionSummary.totalEntries.toFixed(2)}</td></tr>
              <tr><td>Total de Saídas</td><td>R$ ${sessionSummary.totalExits.toFixed(2)}</td></tr>
              <tr><td>Total de Despesas</td><td>R$ ${sessionSummary.totalExpenses.toFixed(2)}</td></tr>
              <tr class="total-row"><td>Valor Final</td><td>R$ ${sessionSummary.finalAmount.toFixed(2)}</td></tr>
              <tr><td>Quantidade de Vendas</td><td>${sessionSummary.salesCount}</td></tr>
              <tr><td>Ticket Médio</td><td>R$ ${sessionSummary.averageTicket.toFixed(2)}</td></tr>
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
                ${sessionTransactions.map(t => `
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

  const handleDeleteSession = async () => {
    if (!session.id) return;
    setIsDeleting(true);
    const success = await deleteSession(session.id);
    setIsDeleting(false);

    if (success) {
      toast({
        title: 'Fechamento enviado para a lixeira',
        description: canRestore
          ? 'Você pode restaurá-lo acessando a Lixeira.'
          : 'Você pode restaurá-lo mais tarde.',
      });
      setIsDeleteDialogOpen(false);
      onBack();
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold text-primary truncate">
            Fechamento - {format(parseISO(session.date), 'dd/MM/yyyy', { locale: ptBR })}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {session.closedAt && `Fechado às ${format(parseISO(session.closedAt), 'HH:mm')}`}
          </p>
        </div>
      </div>

      {/* Session Summary */}
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            Resumo do Fechamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="text-center p-2 sm:p-4 bg-emerald-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">
                R$ {sessionSummary.totalSales.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-emerald-700">Vendas</p>
            </div>
            <div className="text-center p-2 sm:p-4 bg-blue-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
                R$ {sessionSummary.totalEntries.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-blue-700">Entradas</p>
            </div>
            <div className="text-center p-2 sm:p-4 bg-orange-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-orange-600 truncate">
                R$ {sessionSummary.totalExits.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-orange-700">Saídas</p>
            </div>
            <div className="text-center p-2 sm:p-4 bg-red-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">
                R$ {sessionSummary.totalExpenses.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-red-700">Despesas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-primary/5 rounded-lg">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Valor Final</p>
              <p className="text-lg sm:text-2xl font-bold text-primary truncate">
                R$ {sessionSummary.finalAmount.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Vendas Realizadas</p>
              <p className="text-lg sm:text-2xl font-bold">{sessionSummary.salesCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-lg sm:text-2xl font-bold truncate">
                R$ {sessionSummary.averageTicket.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Details */}
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Transações do Dia ({sessionTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessionTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada para este dia.
              </p>
            ) : (
              sessionTransactions.map((transaction) => (
                <div
                  key={transaction.id ?? transaction.createdAt}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transaction.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    {transaction.paymentMethod && (
                      <p className="text-xs text-muted-foreground">
                        {transaction.paymentMethod}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.type === 'venda' || transaction.type === 'entrada' 
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'venda' || transaction.type === 'entrada' ? '+' : '-'}
                      R$ {transaction.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
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
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!session.id}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Excluir fechamento</span>
              <span className="sm:hidden">Excluir</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir fechamento de caixa</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação moverá o fechamento para a lixeira.
                {canRestore && ' Você poderá restaurá-lo na seção Lixeira sempre que precisar.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default CashClosureDetails;