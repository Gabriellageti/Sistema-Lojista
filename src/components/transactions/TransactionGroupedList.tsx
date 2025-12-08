// Sistema Lojista - Transaction Grouped List Component

import { Edit, Trash2, ShoppingCart, TrendingUp, TrendingDown, Minus, Printer, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent } from '@/components/ui/card';
import { Transaction, TransactionInput } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { generateTransactionReceipt } from '@/services/PDFService';

interface TransactionGroupedListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onDuplicate: (transaction: TransactionInput) => void;
  onPrint?: (transaction: Transaction) => void;
}

const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
const formatItemCount = (count: number) => `${count} ${count === 1 ? 'item' : 'itens'}`;

const getDisplayDescription = (transaction: Transaction) => {
  if (transaction.items && transaction.items.length > 0) {
    if (transaction.items.length === 1) {
      return transaction.items[0].description;
    }
    const remainingCount = transaction.items.length - 1;
    return `${transaction.items[0].description} + ${formatItemCount(remainingCount)}`;
  }

  return transaction.description;
};

const renderItemsSummary = (transaction: Transaction) => {
  if (!transaction.items || transaction.items.length === 0) {
    return null;
  }

  const visibleItems = transaction.items.slice(0, 3);
  const remainingCount = transaction.items.length - visibleItems.length;

  return (
    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
      {visibleItems.map((item, index) => (
        <li key={`${item.description}-${index}`}>
          <span className="font-medium text-foreground">{item.quantity}x</span>{' '}
          {item.description} — {formatCurrency(item.total)}
        </li>
      ))}
      {remainingCount > 0 && (
        <li className="italic">
          + {`${formatItemCount(remainingCount)} ${remainingCount === 1 ? 'adicional' : 'adicionais'}`}
        </li>
      )}
    </ul>
  );
};

const TransactionGroupedList = ({
  transactions,
  onEdit,
  onDelete,
  onDuplicate,
  onPrint
}: TransactionGroupedListProps) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'venda':
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case 'entrada':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'saida':
        return <TrendingDown className="w-4 h-4 text-orange-600" />;
      case 'despesa':
        return <Minus className="w-4 h-4 text-red-600" />;
      default:
        return <ShoppingCart className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'venda': return 'Venda';
      case 'entrada': return 'Entrada';
      case 'saida': return 'Saída';
      case 'despesa': return 'Despesa';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'venda': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'entrada': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'saida': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'despesa': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'venda':
      case 'entrada':
        return 'text-emerald-600';
      case 'saida':
      case 'despesa':
        return 'text-red-600';
      default:
        return 'text-foreground';
    }
  };

  const getPaymentLabel = (payment: string) => {
    switch (payment) {
      case 'dinheiro': return 'Dinheiro';
      case 'pix': return 'PIX';
      case 'cartao_debito': return 'C. Débito';
      case 'cartao_credito': return 'C. Crédito';
      case 'outros': return 'Outros';
      default: return payment;
    }
  };

  const getPaymentIcon = (payment: string) => {
    switch (payment) {
      case 'pix': return '💰';
      case 'dinheiro': return '💵';
      case 'cartao_credito': return '💳';
      case 'cartao_debito': return '💳';
      case 'outros': return '💼';
      default: return '💰';
    }
  };

  const handleDelete = (transaction: Transaction) => {
    if (confirm(`Deseja excluir a transação "${getDisplayDescription(transaction)}"?`)) {
      onDelete(transaction.id);
    }
  };

  const { config: receiptConfig } = useReceiptConfig();

  const handlePrint = (transaction: Transaction) => {
    if (onPrint) {
      onPrint(transaction);
    } else {
      try {
        console.log('🧾 === INICIANDO IMPRESSÃO DE TRANSAÇÃO (GROUPED) ===');
        console.log('💳 Transação para impressão:', JSON.stringify(transaction, null, 2));
        console.log('⚙️ Config do recibo obtida:', JSON.stringify(receiptConfig, null, 2));

        if (!receiptConfig) {
          console.error('❌ Configuração de recibo não encontrada');
          alert('Configuração de recibo não encontrada. Verifique as configurações.');
          return;
        }
        
        console.log('📋 Chamando generateTransactionReceipt...');
        const pdfUrl = generateTransactionReceipt(transaction, receiptConfig);
        console.log('📄 URL do PDF gerado:', pdfUrl);
        
        if (!pdfUrl) {
          console.error('❌ Falha na geração do PDF');
          alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
        } else {
          console.log('✅ PDF gerado com sucesso!');
        }
      } catch (error) {
        console.error('❌ Erro ao imprimir transação:', error);
        alert(`Erro ao imprimir recibo: ${error.message}`);
      }
    }
  };

  const handleDuplicate = (transaction: Transaction) => {
    const { id: _unusedId, createdAt: _originalCreatedAt, ...transactionData } = transaction;

    const duplicatedTransaction: TransactionInput = {
      ...transactionData,
      createdAt: new Date().toISOString()
    };

    onDuplicate(duplicatedTransaction);
  };

  const getDateHeader = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const transactionDate = new Date(transaction.createdAt);
    const dateKey = format(transactionDate, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: transactionDate,
        transactions: []
      };
    }
    
    groups[dateKey].transactions.push(transaction);
    return groups;
  }, {} as Record<string, { date: Date; transactions: Transaction[] }>);

  // Sort groups by date (newest first) and transactions within groups by time (newest first)
  const sortedGroups = Object.values(groupedTransactions)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(group => ({
      ...group,
      transactions: group.transactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }));

  if (transactions.length === 0) {
    return (
      <Card className="hs-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma transação encontrada</h3>
          <p className="text-muted-foreground text-center">
            Ajuste os filtros ou comece criando seu primeiro lançamento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sortedGroups.map((group) => (
        <div key={format(group.date, 'yyyy-MM-dd')} className="space-y-3">
          {/* Date Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2">
            <div className="flex items-center gap-3">
              <div className="h-px bg-border flex-1" />
              <h3 className="text-sm font-semibold text-muted-foreground px-3 py-1 bg-muted rounded-full">
                {getDateHeader(group.date)}
              </h3>
              <div className="h-px bg-border flex-1" />
            </div>
          </div>

          {/* Transactions for this date */}
          <div className="space-y-2">
            {group.transactions.map((transaction) => (
              <Card key={transaction.id} className="hs-card hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon and Type */}
                    <div className="flex-shrink-0">
                      {getTypeIcon(transaction.type)}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm truncate flex-1">
                          {getDisplayDescription(transaction)}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getTypeColor(transaction.type)}`}>
                          {getTypeLabel(transaction.type)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>Qtd: {transaction.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Unit: {formatCurrency(transaction.unitPrice)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{getPaymentIcon(transaction.paymentMethod)}</span>
                          <span>{getPaymentLabel(transaction.paymentMethod)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{format(new Date(transaction.createdAt), 'HH:mm', { locale: ptBR })}</span>
                        </div>
                      </div>

                      {renderItemsSummary(transaction)}

                      {transaction.notes && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded italic">
                          "{transaction.notes}"
                        </p>
                      )}
                    </div>

                    {/* Amount and Actions */}
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-lg font-bold mb-2 ${getAmountColor(transaction.type)}`}>
                        {formatCurrency(transaction.total)}
                      </p>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log('🖨️ BOTÃO IMPRIMIR TRANSAÇÃO CLICADO! ID:', transaction.id);
                            handlePrint(transaction);
                          }}
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Imprimir Recibo"
                        >
                          <Printer className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(transaction)}
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Duplicar Lançamento"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(transaction)}
                          className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          title="Editar Lançamento"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionGroupedList;