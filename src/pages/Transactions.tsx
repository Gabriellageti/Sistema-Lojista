// Sistema Lojista - Transactions Page

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { useTransactions } from '@/hooks/useTransactions';
import { Transaction, TransactionInput } from '@/types';
import TransactionForm from '@/components/transactions/TransactionForm';
import TransactionSummaryCards from '@/components/transactions/TransactionSummaryCards';
import TransactionGroupedList from '@/components/transactions/TransactionGroupedList';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';
import { startOfDay, endOfDay, format, parse } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { Badge } from '@/components/ui/badge';
import { useCreditSales } from '@/hooks/useCreditSales';
import { filterSettledTransactions } from '@/utils/creditSalesUtils';

const TRANSACTION_TYPE_LABELS: Record<Transaction['type'], string> = {
  venda: 'Vendas',
  entrada: 'Entradas',
  saida: 'Saídas',
  despesa: 'Despesas',
};

const Transactions = () => {
  const { transactions, loading, saveTransaction, deleteTransaction } = useTransactions();
  const { creditSales } = useCreditSales();
  const settledTransactions = useMemo(
    () => filterSettledTransactions(transactions, creditSales),
    [transactions, creditSales],
  );
  const { config: receiptConfig } = useReceiptConfig();
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | Transaction['type']>('all');
  const { toast } = useToast();

  useEffect(() => {
    // Check URL params for auto-opening form
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setShowForm(true);
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Listen for custom event from floating actions
    const handleOpenForm = () => setShowForm(true);
    window.addEventListener('openTransactionForm', handleOpenForm);
    
    return () => {
      window.removeEventListener('openTransactionForm', handleOpenForm);
    };
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [settledTransactions, searchTerm, startDate, endDate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        setShowForm(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);


  const filterTransactions = useCallback(() => {
    let filtered = [...settledTransactions];

    const rangeStart = startOfDay(startDate);
    const rangeEnd = endOfDay(endDate);

    filtered = filtered.filter(t => {
      const transactionDate = t.createdAt ? new Date(t.createdAt) : null;
      if (!transactionDate || Number.isNaN(transactionDate.getTime())) {
        return false;
      }
      return transactionDate >= rangeStart && transactionDate <= rangeEnd;
    });

    // Search filter
    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const matchesDescription = t.description.toLowerCase().includes(normalizedSearch);
        const matchesNotes = t.notes?.toLowerCase().includes(normalizedSearch);
        const matchesItems = t.items?.some(item => item.description.toLowerCase().includes(normalizedSearch));

        return matchesDescription || matchesNotes || matchesItems;
      });
    }

    setFilteredTransactions(filtered);
  }, [settledTransactions, searchTerm, startDate, endDate]);

  const visibleTransactions = useMemo(() => {
    if (typeFilter === 'all') {
      return filteredTransactions;
    }

    return filteredTransactions.filter((transaction) => transaction.type === typeFilter);
  }, [filteredTransactions, typeFilter]);

  const handleSaveTransaction = async (transaction: TransactionInput) => {
    const wasEditing = Boolean(editingTransaction);
    const savedTransaction = await saveTransaction(transaction);

    if (savedTransaction) {
      setShowForm(false);
      setEditingTransaction(null);

      toast({
        title: wasEditing ? "Transação atualizada" : "Transação criada",
        description: `${savedTransaction.description} - R$ ${savedTransaction.total.toFixed(2)}`,
      });
    }

    return savedTransaction;
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    
    toast({
      title: "Transação excluída",
      description: "A transação foi removida com sucesso.",
    });
  };

  const handleDuplicateTransaction = async (transaction: TransactionInput) => {
    const { id: _unusedId, ...transactionWithoutId } = transaction;

    const duplicatedTransaction = await saveTransaction(transactionWithoutId);

    if (duplicatedTransaction) {
      toast({
        title: "Transação duplicada",
        description: `${transaction.description} foi duplicada com sucesso.`,
      });
    }
  };

  const handleExportCSV = () => {
    exportToCSV(visibleTransactions, startDate, endDate);
    toast({
      title: "Exportação realizada",
      description: "Arquivo CSV baixado com sucesso.",
    });
  };

  const handleExportPDF = () => {
    exportToPDF(visibleTransactions, startDate, endDate);
    toast({
      title: "Exportação realizada",
      description: "Arquivo PDF baixado com sucesso.",
    });
  };

  const storeName = (receiptConfig.nomeLoja || 'Sistema Lojista').trim() || 'Sistema Lojista';
  const storePhone = receiptConfig.telefoneLoja?.trim();
  const storeInstagram = receiptConfig.instagramLoja?.trim();
  const storeAddressLines = receiptConfig.enderecoLoja
    ? receiptConfig.enderecoLoja
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-primary">Lançamentos</h1>
          <div className="text-sm leading-tight text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground">{storeName}</p>
            {storePhone && <p>Telefone: {storePhone}</p>}
            {storeInstagram && <p>Instagram: {storeInstagram.startsWith('@') ? storeInstagram : `@${storeInstagram}`}</p>}
            {storeAddressLines.map((line, index) => (
              <p key={`store-address-${index}`}>{line}</p>
            ))}
          </div>
          <p className="text-muted-foreground">
            Lançamentos de hoje • Ctrl+N para novo lançamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="hidden md:flex"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button 
            onClick={() => setShowForm(true)}
            variant="hero"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Mobile Export Buttons */}
      <div className="flex gap-2 md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="space-y-3">
        <TransactionSummaryCards
          transactions={filteredTransactions}
          selectedType={typeFilter}
          onTypeSelect={setTypeFilter}
        />
        {typeFilter !== 'all' && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Filtro aplicado: {TRANSACTION_TYPE_LABELS[typeFilter]}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter('all')}
              className="h-7 px-3"
            >
              Limpar filtro
            </Button>
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Início</label>
          <Input
            type="date"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) =>
              setStartDate(parse(e.target.value, 'yyyy-MM-dd', new Date()))
            }
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Fim</label>
          <Input
            type="date"
            value={format(endDate, 'yyyy-MM-dd')}
            onChange={(e) =>
              setEndDate(parse(e.target.value, 'yyyy-MM-dd', new Date()))
            }
          />
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Transaction Grouped List */}
      <TransactionGroupedList
        transactions={visibleTransactions}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        onDuplicate={handleDuplicateTransaction}
      />

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
          onCancel={() => {
            setShowForm(false);
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
};

export default Transactions;
