// Sistema Lojista - Transaction List Component

import { Edit, Trash2, ShoppingCart, TrendingUp, TrendingDown, Minus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent } from '@/components/ui/card';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '@/hooks/useTransactions';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { generateTransactionReceipt } from '@/services/PDFService';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
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

  const visibleItems = transaction.items.slice(0, 2);
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

const TransactionList = ({ transactions, onEdit, onDelete, onPrint }: TransactionListProps) => {
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
      case 'venda':
        return 'Venda';
      case 'entrada':
        return 'Entrada';
      case 'saida':
        return 'Saída';
      case 'despesa':
        return 'Despesa';
      default:
        return type;
    }
  };

  const getPaymentLabel = (payment: string) => {
    switch (payment) {
      case 'dinheiro':
        return 'Dinheiro';
      case 'pix':
        return 'PIX';
      case 'cartao_debito':
        return 'C. Débito';
      case 'cartao_credito':
        return 'C. Crédito';
      case 'outros':
        return 'Outros';
      default:
        return payment;
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
        console.log('🧾 Iniciando impressão de transação (lista simples)...');
        console.log('💳 Transação para impressão:', JSON.stringify(transaction, null, 2));
        console.log('⚙️ Config do recibo obtida:', JSON.stringify(receiptConfig, null, 2));

        if (!receiptConfig) {
          console.error('❌ Configuração de recibo não encontrada');
          alert('Configuração de recibo não encontrada. Verifique as configurações.');
          return;
        }
        
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

  if (transactions.length === 0) {
    return (
      <Card className="hs-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma transação encontrada</h3>
          <p className="text-muted-foreground text-center">
            Comece criando seu primeiro lançamento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="hs-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Transaction Info */}
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(transaction.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">
                      {getDisplayDescription(transaction)}
                    </h3>
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full shrink-0">
                      {getTypeLabel(transaction.type)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <span>Qtd: {transaction.quantity}</span>
                    <span>Unit: {formatCurrency(transaction.unitPrice)}</span>
                    <span>{getPaymentLabel(transaction.paymentMethod)}</span>
                    <span>
                      {format(new Date(transaction.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                    </span>
                  </div>

                  {renderItemsSummary(transaction)}

                  {transaction.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {transaction.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount and Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(transaction.total)}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      console.log('🖨️ BOTÃO IMPRIMIR TRANSAÇÃO CLICADO! ID:', transaction.id);
                      handlePrint(transaction);
                    }}
                    className="h-8 w-8 text-green-600 hover:text-green-700"
                    title="Imprimir Recibo"
                  >
                    <Printer className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(transaction)}
                    className="h-8 w-8"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(transaction)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
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
  );
};

export default TransactionList;