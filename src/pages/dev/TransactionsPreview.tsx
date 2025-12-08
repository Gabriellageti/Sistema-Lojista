import { useMemo } from 'react';
import TransactionGroupedList from '@/components/transactions/TransactionGroupedList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, TransactionInput } from '@/types';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const previewTransactions: Transaction[] = [
  {
    id: 'preview-1',
    sessionId: 'preview-session',
    type: 'venda',
    description: 'Venda - Capinha Transparente',
    quantity: 1,
    unitPrice: 49.9,
    total: 49.9,
    paymentMethod: 'dinheiro',
    items: [
      {
        description: 'Capinha Transparente Premium',
        quantity: 1,
        unitPrice: 49.9,
        total: 49.9,
      },
    ],
    notes: 'Cliente comprou apenas a capinha transparente.',
    createdAt: hoursAgo(5),
  },
  {
    id: 'preview-2',
    sessionId: 'preview-session',
    type: 'venda',
    description: 'Venda - Kit Proteção',
    quantity: 2,
    unitPrice: 37.45,
    total: 74.9,
    paymentMethod: 'pix',
    items: [
      {
        description: 'Película 3D',
        quantity: 1,
        unitPrice: 29.9,
        total: 29.9,
      },
      {
        description: 'Capa Silicone Colorida',
        quantity: 1,
        unitPrice: 45,
        total: 45,
      },
    ],
    notes: 'Combo com película e capa.',
    createdAt: hoursAgo(3),
  },
  {
    id: 'preview-3',
    sessionId: 'preview-session',
    type: 'venda',
    description: 'Venda - Kit Completo Smartphone',
    quantity: 3,
    unitPrice: 59.9,
    total: 179.7,
    paymentMethod: 'cartao_credito',
    items: [
      {
        description: 'Película Vidro Premium',
        quantity: 1,
        unitPrice: 30,
        total: 30,
      },
      {
        description: 'Capinha Anti-impacto',
        quantity: 1,
        unitPrice: 59.9,
        total: 59.9,
      },
      {
        description: 'Carregador Turbo 25W',
        quantity: 1,
        unitPrice: 89.8,
        total: 89.8,
      },
    ],
    notes: 'Pacote completo para smartphone.',
    createdAt: hoursAgo(1),
  },
];

const TransactionsPreview = () => {
  const transactions = useMemo(() => previewTransactions, []);

  const noop = () => undefined;
  const handleDuplicate = (transaction: TransactionInput) => {
    console.info('Duplicar (pré-visualização):', transaction.description);
  };

  return (
    <div className="min-h-screen bg-muted/40 py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <Card className="shadow-lg border border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl">Pré-visualização • Vendas com múltiplos itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Esta tela de apoio exibe o componente <code>TransactionGroupedList</code> com vendas de 1, 2 e 3 itens
              para validar o resumo dos itens.
            </p>
            <TransactionGroupedList
              transactions={transactions}
              onEdit={noop}
              onDelete={noop}
              onDuplicate={handleDuplicate}
              onPrint={noop}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionsPreview;
