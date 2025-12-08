// Help Smart - Transaction Summary Cards Component

import { TrendingUp, TrendingDown, ArrowDownLeft, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Transaction } from '@/types';
import { cn } from '@/lib/utils';

interface TransactionSummaryCardsProps {
  transactions: Transaction[];
  selectedType?: 'all' | Transaction['type'];
  onTypeSelect?: (type: 'all' | Transaction['type']) => void;
}

const TransactionSummaryCards = ({ transactions, selectedType = 'all', onTypeSelect }: TransactionSummaryCardsProps) => {
  const calculateTotals = () => {
    return transactions.reduce(
      (acc, transaction) => {
        switch (transaction.type) {
          case 'venda':
            acc.sales += transaction.total;
            break;
          case 'saida':
            acc.exits += transaction.total;
            break;
        }
        return acc;
      },
      { sales: 0, exits: 0 }
    );
  };

  const totals = calculateTotals();
  const dailyBalance = totals.sales - totals.exits;
  const isPositiveBalance = dailyBalance >= 0;

  const summaryCards = [
    {
      title: 'Vendas',
      value: totals.sales,
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      tooltip: 'Total de vendas registradas no período',
      type: 'venda' as Transaction['type'],
    },
    {
      title: 'Saídas',
      value: totals.exits,
      icon: ArrowDownLeft,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      tooltip: 'Saídas de dinheiro no período',
      type: 'saida' as Transaction['type'],
    }
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TooltipProvider>
          {summaryCards.map((card, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Card
                  role={onTypeSelect ? 'button' : undefined}
                  tabIndex={onTypeSelect ? 0 : undefined}
                  aria-pressed={onTypeSelect ? selectedType === card.type : undefined}
                  onClick={
                    onTypeSelect
                      ? () => onTypeSelect(selectedType === card.type ? 'all' : card.type)
                      : undefined
                  }
                  onKeyDown={
                    onTypeSelect
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onTypeSelect(selectedType === card.type ? 'all' : card.type);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'hs-card transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    onTypeSelect ? 'cursor-pointer hover:shadow-md' : 'cursor-help',
                    onTypeSelect && selectedType === card.type
                      ? 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background shadow-lg'
                      : ''
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${card.bgColor}`}>
                        <card.icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate">{card.title}</p>
                        <p className={`text-lg font-bold ${card.color}`}>
                          R$ {card.value.toFixed(2)}
                        </p>
                        {onTypeSelect && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Clique para {selectedType === card.type ? 'remover o filtro' : `ver apenas ${card.title.toLowerCase()}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {onTypeSelect
                    ? `${card.tooltip}. Clique para filtrar por ${card.title.toLowerCase()}.`
                    : card.tooltip}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Daily Balance */}
      <Card className="hs-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${isPositiveBalance ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {isPositiveBalance ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo do Período</p>
                <p className={`text-2xl font-bold ${isPositiveBalance ? 'text-emerald-600' : 'text-red-600'}`}>
                  R$ {Math.abs(dailyBalance).toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                isPositiveBalance 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isPositiveBalance ? '+' : '-'}
                {isPositiveBalance ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isPositiveBalance ? 'Resultado positivo' : 'Resultado negativo'}
              </p>
            </div>
          </div>
          
          {/* Calculation breakdown */}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Cálculo: Vendas (R$ {totals.sales.toFixed(2)}) - Saídas (R$ {totals.exits.toFixed(2)})
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionSummaryCards;