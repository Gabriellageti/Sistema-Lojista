import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Plus,
  Printer,
  Search,
  Users,
  Trash2,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CreditSaleForm, {
  CreditSaleFormValues,
} from '@/components/credit-sales/CreditSaleForm';
import { PaymentRegistrationForm } from '@/components/credit-sales/PaymentRegistrationForm';
import { PAYMENT_METHOD_LABELS } from '@/components/credit-sales/payment-method-labels';
import { useCreditSales } from '@/hooks/useCreditSales';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { useCashSessions } from '@/hooks/useCashSessions';
import type {
  CreditSale as CreditSaleRecord,
  CreditSaleStatus,
  CreditSalePayment,
  PaymentMethod,
  CreditSaleItem,
} from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { generateCreditSalePaymentReceipt } from '@/services/PDFService';

type CreditSaleComputedStatus = 'pending' | 'paid' | 'overdue';
type DueFilter = 'all' | 'today' | 'week' | 'fifteen' | 'overdue';

const formatDateForInput = (date: Date) => format(date, 'yyyy-MM-dd');

const normalizeDateInput = (value: string): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const formatItemCount = (count: number) => `${count} ${count === 1 ? 'item' : 'itens'}`;

const renderItemsSummary = (items: CreditSaleItem[], expanded: boolean) => {
  if (!items || items.length === 0) {
    return null;
  }

  const visibleItems = expanded ? items : items.slice(0, 2);
  const remainingCount = items.length - visibleItems.length;

  return (
    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
      <ul className="space-y-1">
        {visibleItems.map((item, index) => (
          <li key={`${item.description}-${index}`}>
            <span className="font-medium text-foreground">{item.quantity}x</span>{' '}
            {item.description} — {formatCurrency(item.total)}
          </li>
        ))}
      </ul>
      {!expanded && remainingCount > 0 && (
        <p className="italic">
          + {`${formatItemCount(remainingCount)} ${remainingCount === 1 ? 'adicional' : 'adicionais'}`}
        </p>
      )}
    </div>
  );
};

const getComputedStatus = (sale: CreditSaleRecord): CreditSaleComputedStatus => {
  if (sale.status === 'paga') {
    return 'paid';
  }

  const due = startOfDay(parseISO(sale.chargeDate));
  const todayStart = startOfDay(new Date());

  if (isBefore(due, todayStart)) {
    return 'overdue';
  }

  return 'pending';
};

const statusLabelMap: Record<CreditSaleComputedStatus, string> = {
  pending: 'Em aberto',
  paid: 'Pago',
  overdue: 'Em atraso',
};

const statusClassMap: Record<CreditSaleComputedStatus, string> = {
  pending:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-100',
  overdue:
    'bg-destructive/10 text-destructive border-destructive/30 dark:bg-red-500/20 dark:text-red-100',
  paid:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100',
};

const CreditSales = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<CreditSaleRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CreditSaleComputedStatus>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [salePendingRemoval, setSalePendingRemoval] = useState<CreditSaleRecord | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSale, setPaymentSale] = useState<CreditSaleRecord | null>(null);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  const creditSalesApi = useCreditSales();
  const { currentSession } = useCashSessions();
  const { config: receiptConfig } = useReceiptConfig();

  const buildSaleSnapshotAfterPayment = (
    sale: CreditSaleRecord,
    amount: number,
  ): CreditSaleRecord => {
    const previousAmountPaid = sale.amountPaid ?? 0;
    const newAmountPaid = roundCurrency(previousAmountPaid + amount);
    const rawRemaining = roundCurrency(sale.total - newAmountPaid);
    const newRemainingAmount = rawRemaining <= 0 ? 0 : rawRemaining;
    const newStatus: CreditSaleStatus = newRemainingAmount <= 0 ? 'paga' : 'em_aberto';

    const calculateInstallmentInterval = () => {
      try {
        const saleDate = parseISO(sale.saleDate);
        const currentChargeDate = parseISO(sale.chargeDate);

        if (Number.isNaN(saleDate.getTime()) || Number.isNaN(currentChargeDate.getTime())) {
          return null;
        }

        const baseInstallmentValue =
          sale.installmentValue ?? (sale.installments > 0 ? sale.total / sale.installments : null);
        const installmentsPaid =
          baseInstallmentValue && baseInstallmentValue > 0
            ? Math.floor(previousAmountPaid / baseInstallmentValue)
            : 0;

        const totalDaysSinceSale = Math.max(differenceInCalendarDays(currentChargeDate, saleDate), 0);

        if (installmentsPaid > 0) {
          const interval = Math.round(totalDaysSinceSale / installmentsPaid);
          return interval > 0 ? interval : null;
        }

        return totalDaysSinceSale > 0 ? totalDaysSinceSale : null;
      } catch (error) {
        console.warn('Failed to calculate installment interval for receipt preview', error);
        return null;
      }
    };

    const intervalBetweenInstallments = calculateInstallmentInterval();
    const effectiveInterval = intervalBetweenInstallments ?? 30;

    let chargeDate = sale.chargeDate;

    if (newRemainingAmount > 0) {
      try {
        const currentChargeDate = parseISO(sale.chargeDate);
        if (!Number.isNaN(currentChargeDate.getTime())) {
          chargeDate = addDays(currentChargeDate, effectiveInterval).toISOString();
        }
      } catch (error) {
        console.warn('Failed to project next charge date for receipt', error);
      }
    }

    return {
      ...sale,
      amountPaid: newAmountPaid,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      chargeDate,
    };
  };

  const emitPaymentReceipt = (
    sale: CreditSaleRecord,
    payment: CreditSalePayment,
    includeStoreCopy: boolean,
  ) => {
    if (!receiptConfig) {
      toast.error('Configuração de recibo não encontrada.');
      return;
    }

    try {
      generateCreditSalePaymentReceipt(payment, sale, receiptConfig, 'cliente');
      if (includeStoreCopy) {
        generateCreditSalePaymentReceipt(payment, sale, receiptConfig, 'loja');
      }
    } catch (error) {
      console.error('Erro ao gerar recibo do crediário:', error);
      toast.error('Não foi possível gerar o recibo do pagamento.');
    }
  };

  const promptReceiptGeneration = (sale: CreditSaleRecord, payment: CreditSalePayment) => {
    const includeStoreCopy = window.confirm('Imprimir também a via da loja?');
    emitPaymentReceipt(sale, payment, includeStoreCopy);
  };

  const activeSales = useMemo(
    () =>
      creditSalesApi.creditSales.filter(
        sale => !sale.deletedAt && !sale.archivedAt,
      ),
    [creditSalesApi.creditSales],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setShowForm(true);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const handleOpenForm = () => setShowForm(true);
    window.addEventListener('openCreditSaleForm', handleOpenForm);

    return () => {
      window.removeEventListener('openCreditSaleForm', handleOpenForm);
    };
  }, []);

  const alerts = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const upcomingEnd = endOfDay(addDays(todayStart, 7));

    const overdueSales = activeSales.filter(
      sale => getComputedStatus(sale) === 'overdue',
    );
    const dueTodaySales = activeSales.filter(
      sale =>
        getComputedStatus(sale) !== 'paid' &&
        isSameDay(parseISO(sale.chargeDate), todayStart),
    );
    const upcomingSales = activeSales.filter(sale => {
      if (getComputedStatus(sale) !== 'pending') {
        return false;
      }
      const due = parseISO(sale.chargeDate);
      return isWithinInterval(due, {
        start: addDays(todayStart, 1),
        end: upcomingEnd,
      });
    });

    const outstandingOpenSales = activeSales.filter(
      sale => getComputedStatus(sale) !== 'paid',
    );

    const outstandingTotal = outstandingOpenSales.reduce(
      (total, sale) => total + (sale.remainingAmount ?? sale.total),
      0,
    );

    const overdueTotal = overdueSales.reduce(
      (total, sale) => total + (sale.remainingAmount ?? sale.total),
      0,
    );

    const dueTodayTotal = dueTodaySales.reduce(
      (total, sale) => total + (sale.remainingAmount ?? sale.total),
      0,
    );

    const upcomingTotal = upcomingSales.reduce(
      (total, sale) => total + (sale.remainingAmount ?? sale.total),
      0,
    );

    const openCount = outstandingOpenSales.length;

    return {
      overdueSales,
      dueTodaySales,
      upcomingSales,
      outstandingTotal,
      overdueTotal,
      dueTodayTotal,
      upcomingTotal,
      averageTicket: openCount > 0 ? outstandingTotal / openCount : 0,
    };
  }, [activeSales]);

  const filteredSales = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const weekEnd = endOfDay(addDays(todayStart, 7));
    const fifteenEnd = endOfDay(addDays(todayStart, 15));

    return activeSales
      .filter(sale => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const computedStatus = getComputedStatus(sale);

        if (statusFilter !== 'all' && computedStatus !== statusFilter) {
          return false;
        }

        if (normalizedSearch) {
          const matchesSearch =
            sale.customerName.toLowerCase().includes(normalizedSearch) ||
            sale.description.toLowerCase().includes(normalizedSearch) ||
            sale.customerPhone?.toLowerCase().includes(normalizedSearch) ||
            sale.items?.some((item) =>
              item.description.toLowerCase().includes(normalizedSearch),
            );

          if (!matchesSearch) {
            return false;
          }
        }

        if (dueFilter !== 'all') {
          const due = parseISO(sale.chargeDate);

          if (dueFilter === 'overdue' && !isBefore(due, todayStart)) {
            return false;
          }

          if (dueFilter === 'today' && !isSameDay(due, todayStart)) {
            return false;
          }

          if (
            dueFilter === 'week' &&
            !isWithinInterval(due, { start: todayStart, end: weekEnd })
          ) {
            return false;
          }

          if (
            dueFilter === 'fifteen' &&
            !isWithinInterval(due, { start: todayStart, end: fifteenEnd })
          ) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          parseISO(a.chargeDate).getTime() - parseISO(b.chargeDate).getTime(),
      );
  }, [activeSales, statusFilter, dueFilter, searchTerm]);

  const handleSaveSale = async (
    values: CreditSaleFormValues,
  ): Promise<CreditSaleRecord | null> => {
    const totalValue = Number(values.total);
    if (!Number.isFinite(totalValue) || totalValue <= 0) {
      toast.error('Informe um valor total maior que zero.');
      return null;
    }

    if (!values.customerName.trim()) {
      toast.error('Informe o nome do cliente.');
      return null;
    }

    if (!values.dueDate) {
      toast.error('Escolha uma data de vencimento.');
      return null;
    }

    if (!values.items || values.items.length === 0) {
      toast.error('Adicione pelo menos um item.');
      return null;
    }

    const installments = Math.max(values.installments || 1, 1);
    const amountPaid = values.amountPaid ?? editingSale?.amountPaid ?? 0;
    const remainingAmount = values.remainingAmount ?? Math.max(totalValue - amountPaid, 0);

    const saleData = {
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone?.trim() || null,
      description: values.description.trim(),
      items: values.items,
      total: totalValue,
      installments,
      amountPaid,
      remainingAmount,
      saleDate: editingSale?.saleDate || new Date().toISOString(),
      chargeDate: normalizeDateInput(values.dueDate),
      status: 'em_aberto' as CreditSaleStatus,
      reminderPreferences: editingSale?.reminderPreferences || null,
      notes: values.notes?.trim() || null,
      archivedAt: editingSale?.archivedAt || null,
      deletedAt: null,
    };

    let result: CreditSaleRecord | null = null;

    if (editingSale?.id) {
      result = await creditSalesApi.updateCreditSale({
        ...saleData,
        id: editingSale.id,
        createdAt: editingSale.createdAt,
        updatedAt: new Date().toISOString(),
      });
    } else {
      result = await creditSalesApi.createCreditSale(saleData);
    }

    if (!result) {
      return null;
    }

    setShowForm(false);
    setEditingSale(null);

    return result;
  };

  const handleRegisterPayment = (sale: CreditSaleRecord) => {
    setPaymentSale(sale);
    setShowPaymentForm(true);
  };

  const toggleItemsExpansion = (saleId?: string) => {
    if (!saleId) return;
    setExpandedSales((current) => {
      const next = new Set(current);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const handleSavePayment = async (payment: {
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    sessionId?: string | null;
    notes?: string | null;
  }) => {
    if (!paymentSale?.id) return;

    const paymentRecord = await creditSalesApi.registerPayment(paymentSale.id, {
      ...payment,
      sessionId: currentSession?.id ?? null,
    });

    if (paymentRecord) {
      const saleSnapshot = buildSaleSnapshotAfterPayment(paymentSale, payment.amount);
      promptReceiptGeneration(saleSnapshot, paymentRecord);
      setShowPaymentForm(false);
      setPaymentSale(null);
    }
  };

  const handleEditSale = (sale: CreditSaleRecord) => {
    setEditingSale(sale);
    setShowForm(true);
  };

  const handleConfirmRemoveSale = async () => {
    if (!salePendingRemoval?.id) return;

    setIsRemoving(true);

    try {
      await creditSalesApi.removeCreditSale(salePendingRemoval.id);
    } finally {
      setIsRemoving(false);
      setSalePendingRemoval(null);
    }
  };

  const getDueSummary = (sale: CreditSaleRecord) => {
    if (sale.status === 'paga') {
      return 'Totalmente pago';
    }

    const todayStart = startOfDay(new Date());
    const due = parseISO(sale.chargeDate);
    const diff = differenceInCalendarDays(due, todayStart);

    if (diff === 0) {
      return 'Vence hoje';
    }

    if (diff > 0) {
      return `Vence em ${diff} dia${diff === 1 ? '' : 's'}`;
    }

    const overdueDays = Math.abs(diff);
    return `Atrasado há ${overdueDays} dia${overdueDays === 1 ? '' : 's'}`;
  };

  const getPaymentProgress = (sale: CreditSaleRecord) => {
    const paid = sale.amountPaid || 0;
    const total = sale.total;
    return (paid / total) * 100;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-primary">Vendas a Prazo</h1>
          <p className="text-muted-foreground">
            Controle lançamentos parcelados, registre pagamentos e acompanhe recebimentos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowForm(true)}
            variant="hero"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            Nova venda a prazo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="hs-card">
          <CardHeader className="pb-2">
            <CardDescription>Saldo em aberto</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <CreditCard className="h-6 w-6 text-primary" />
              {formatCurrency(alerts.outstandingTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ticket médio aberto {formatCurrency(alerts.averageTicket || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="hs-card">
          <CardHeader className="pb-2">
            <CardDescription>Em atraso</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl text-destructive">
              <AlertTriangle className="h-6 w-6" />
              {alerts.overdueSales.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Valor pendente {formatCurrency(alerts.overdueTotal)}
            </p>
          </CardContent>
        </Card>

        <Card className="hs-card">
          <CardHeader className="pb-2">
            <CardDescription>Vence hoje</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <CalendarClock className="h-6 w-6 text-primary" />
              {alerts.dueTodaySales.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total {formatCurrency(alerts.dueTodayTotal)}
            </p>
          </CardContent>
        </Card>

        <Card className="hs-card">
          <CardHeader className="pb-2">
            <CardDescription>Próximos 7 dias</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Users className="h-6 w-6 text-primary" />
              {alerts.upcomingSales.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Valor {formatCurrency(alerts.upcomingTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="hs-card">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, descrição ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Em aberto</SelectItem>
                <SelectItem value="overdue">Em atraso</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dueFilter} onValueChange={(v: any) => setDueFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por vencimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vencimentos</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="today">Vence hoje</SelectItem>
                <SelectItem value="week">Próximos 7 dias</SelectItem>
                <SelectItem value="fifteen">Próximos 15 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredSales.length === 0 ? (
          <Card className="hs-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma venda a prazo encontrada
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || dueFilter !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Comece criando uma nova venda a prazo'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => {
            const computedStatus = getComputedStatus(sale);
            const progress = getPaymentProgress(sale);
            const payments = creditSalesApi.getPaymentsBySale(sale.id!);
            const sortedPayments = [...payments].sort(
              (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
            );
            const lastPayment = sortedPayments[0];
            const nextDueDate = parseISO(sale.chargeDate);
            const nextDueFormatted = format(nextDueDate, 'dd/MM/yyyy', { locale: ptBR });

            return (
              <Card key={sale.id} className="hs-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{sale.customerName}</CardTitle>
                        <Badge variant="outline" className={statusClassMap[computedStatus]}>
                          {statusLabelMap[computedStatus]}
                        </Badge>
                      </div>
                      <CardDescription>{sale.description}</CardDescription>
                      {sale.customerPhone && (
                        <p className="text-sm text-muted-foreground">{sale.customerPhone}</p>
                      )}
                      {sale.items && sale.items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Itens</span>
                            {sale.items.length > 2 && sale.id && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto px-0 text-xs"
                                onClick={() => toggleItemsExpansion(sale.id!)}
                              >
                                {expandedSales.has(sale.id!) ? 'Ver menos' : 'Ver todos'}
                              </Button>
                            )}
                          </div>
                          {renderItemsSummary(sale.items, sale.id ? expandedSales.has(sale.id) : false)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSale(sale)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSalePendingRemoval(sale)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor total</p>
                      <p className="text-2xl font-bold">{formatCurrency(sale.total)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Restante</p>
                      <p className="text-2xl font-bold text-destructive">
                        {formatCurrency(sale.remainingAmount ?? sale.total)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso de pagamento</span>
                      <span className="font-medium">
                        {formatCurrency(sale.amountPaid)} de {formatCurrency(sale.total)}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {sale.installments}x de {formatCurrency((sale.installmentValue || 0))}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Próximo vencimento</p>
                        <Badge
                          variant="outline"
                          className={`${statusClassMap[computedStatus]} text-xs font-semibold px-2 py-1`}
                        >
                          {nextDueFormatted}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{getDueSummary(sale)}</p>
                      {lastPayment ? (
                        <p className="text-xs text-muted-foreground">
                          Último pagamento em{' '}
                          <span className="font-medium text-foreground">
                            {format(parseISO(lastPayment.paymentDate), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>{' '}
                          no valor de{' '}
                          <span className="font-medium text-foreground">
                            {formatCurrency(lastPayment.amount)}
                          </span>{' '}
                          via {PAYMENT_METHOD_LABELS[lastPayment.paymentMethod]}.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Nenhum pagamento registrado até o momento.
                        </p>
                      )}
                      {payments.length > 0 && (
                        <Accordion type="single" collapsible className="w-full text-left">
                          <AccordionItem value={`payments-${sale.id}`}>
                            <AccordionTrigger className="text-sm font-medium">
                              Pagamentos registrados ({payments.length})
                            </AccordionTrigger>
                            <AccordionContent>
                              <ScrollArea className="max-h-40 pr-4">
                                <div className="space-y-3 py-1">
                                  {sortedPayments.map((payment, index) => (
                                    <div
                                      key={
                                        payment.id ??
                                        `${payment.creditSaleId}-${payment.paymentDate}-${index}`
                                      }
                                      className="space-y-1"
                                    >
                                  <div className="flex items-start justify-between text-sm">
                                    <div>
                                      <p className="font-medium">
                                        {format(parseISO(payment.paymentDate), 'dd/MM/yyyy', {
                                          locale: ptBR,
                                        })}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold">
                                        {formatCurrency(payment.amount)}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => promptReceiptGeneration(sale, payment)}
                                        aria-label="Reimprimir recibo"
                                        title="Reimprimir recibo"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                      {payment.notes && (
                                        <p className="text-xs text-muted-foreground">
                                          {payment.notes}
                                        </p>
                                      )}
                                      {index < sortedPayments.length - 1 && (
                                        <Separator className="my-2" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>

                    {sale.status !== 'paga' && (sale.remainingAmount ?? sale.total) > 0 && (
                      <Button
                        onClick={() => handleRegisterPayment(sale)}
                        variant="hero"
                      >
                        <DollarSign className="h-4 w-4" />
                        Lançar Pagamento
                      </Button>
                    )}
                  </div>

                  {sale.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Observações:</p>
                      <p className="text-sm">{sale.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {showForm && (
        <CreditSaleForm
          sale={editingSale}
          onSave={handleSaveSale}
          onCancel={() => {
            setShowForm(false);
            setEditingSale(null);
          }}
        />
      )}

      {showPaymentForm && paymentSale && (
        <PaymentRegistrationForm
          creditSaleId={paymentSale.id!}
          remainingAmount={paymentSale.remainingAmount ?? paymentSale.total}
          onSave={handleSavePayment}
          onCancel={() => {
            setShowPaymentForm(false);
            setPaymentSale(null);
          }}
        />
      )}

      <AlertDialog
        open={!!salePendingRemoval}
        onOpenChange={(open) => !open && setSalePendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a venda a prazo de{' '}
              <strong>{salePendingRemoval?.customerName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveSale} disabled={isRemoving}>
              {isRemoving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreditSales;
