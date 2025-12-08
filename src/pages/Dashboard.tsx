// Sistema Lojista - Dashboard/Home Page

import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Wrench,
  FileText,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CashSessionManager from '@/components/cash/CashSessionManager';
import { useCashSessions } from '@/hooks/useCashSessions';
import { useTransactions } from '@/hooks/useTransactions';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { useCreditSales } from '@/hooks/useCreditSales';
import { CashSession, CreditSale, PaymentMethod, Transaction } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { filterSettledTransactions } from '@/utils/creditSalesUtils';

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'outros', label: 'Outros' },
];

const ALERT_FILTER_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'upcoming', label: 'Próximos 7 dias' },
  { value: 'all', label: 'Todos avisos' },
] as const;

type AlertFilter = (typeof ALERT_FILTER_OPTIONS)[number]['value'];

const formatDateTimeInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");
const formatDateInput = (date: Date) => format(date, 'yyyy-MM-dd');

const parseDateInput = (value: string): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const normalized = value.includes('T') ? value : `${value}T00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const Dashboard = () => {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [todayStats, setTodayStats] = useState({
    transactions: 0,
    sales: 0,
    openOrders: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('today');
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [actionType, setActionType] = useState<'complete' | 'postpone' | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'dinheiro' as PaymentMethod,
    paymentDate: formatDateTimeInput(new Date()),
    notes: '',
  });
  const [postponeForm, setPostponeForm] = useState({
    chargeDate: formatDateInput(new Date()),
    reminderDays: 0,
    notes: '',
  });
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const { currentSession: cashSession } = useCashSessions();
  const { transactions, reload: reloadTransactions } = useTransactions();
  const { orders } = useServiceOrders();
  const {
    creditSales,
    registerPayment,
    postponeCreditSale,
    loading: creditSalesLoading,
  } = useCreditSales();
  const navigate = useNavigate();
  const { toast } = useToast();

  const settledTransactions = useMemo(
    () => filterSettledTransactions(transactions, creditSales),
    [transactions, creditSales],
  );

  useEffect(() => {
    setCurrentSession(cashSession);
  }, [cashSession]);

  useEffect(() => {
    calculateTodayStats();
    loadRecentTransactions();
  }, [settledTransactions, orders]);

  const calculateTodayStats = () => {
    const today = new Date();
    const startDay = startOfDay(today);
    const endDay = endOfDay(today);

    const todayTransactions = settledTransactions.filter((transaction) => {
      const transactionDate = transaction.createdAt ? new Date(transaction.createdAt) : null;
      if (!transactionDate || Number.isNaN(transactionDate.getTime())) {
        return false;
      }
      return transactionDate >= startDay && transactionDate <= endDay;
    });

    const openOrders = orders.filter((order) => order.status === 'aberta');

    const salesTotal = todayTransactions
      .filter((transaction) => transaction.type === 'venda')
      .reduce((sum, transaction) => sum + transaction.total, 0);

    setTodayStats({
      transactions: todayTransactions.length,
      sales: salesTotal,
      openOrders: openOrders.length,
    });
  };

  const loadRecentTransactions = () => {
    const sorted = [...settledTransactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setRecentTransactions(sorted.slice(0, 5));
  };

  const shouldDisplaySale = (sale: CreditSale, referenceDate: Date) => {
    if (sale.status !== 'em_aberto' || sale.deletedAt || sale.archivedAt) {
      return false;
    }

    const dueDate = parseISO(sale.chargeDate);
    if (!isValid(dueDate)) {
      return false;
    }

    const reminder = sale.reminderPreferences;
    if (reminder && reminder.enabled === false) {
      return false;
    }

    const effectiveDaysBefore = Math.max(0, reminder?.daysBefore ?? 0);
    const reminderBase = subDays(startOfDay(dueDate), effectiveDaysBefore);
    const reminderMoment = (() => {
      if (!reminder?.remindAt) {
        return reminderBase;
      }

      const [hours, minutes] = reminder.remindAt.split(':').map((part) => Number.parseInt(part, 10));
      const target = new Date(reminderBase);
      if (!Number.isNaN(hours)) {
        target.setHours(hours);
        target.setMinutes(Number.isNaN(minutes) ? 0 : minutes);
        target.setSeconds(0, 0);
      }
      return target;
    })();

    if (!reminder) {
      return referenceDate >= startOfDay(dueDate) || referenceDate > dueDate;
    }

    return referenceDate >= reminderMoment;
  };

  const matchesFilter = (sale: CreditSale, referenceDate: Date) => {
    const dueDate = parseISO(sale.chargeDate);
    if (!isValid(dueDate)) {
      return false;
    }

    switch (alertFilter) {
      case 'today':
        return isSameDay(dueDate, referenceDate);
      case 'overdue':
        return isBefore(dueDate, startOfDay(referenceDate));
      case 'upcoming': {
        const daysUntil = differenceInCalendarDays(dueDate, referenceDate);
        return isAfter(dueDate, endOfDay(referenceDate)) && daysUntil <= 7;
      }
      case 'all':
      default:
        return true;
    }
  };

  const alertSales = useMemo(() => {
    const referenceDate = new Date();
    return creditSales
      .filter((sale) => shouldDisplaySale(sale, referenceDate))
      .filter((sale) => matchesFilter(sale, referenceDate))
      .sort((a, b) => {
        const dateA = parseISO(a.chargeDate);
        const dateB = parseISO(b.chargeDate);
        if (!isValid(dateA) || !isValid(dateB)) {
          return 0;
        }
        return dateA.getTime() - dateB.getTime();
      });
  }, [creditSales, alertFilter]);

  const openPaymentDialog = (sale: CreditSale) => {
    setSelectedSale(sale);
    setActionType('complete');
    setPaymentForm({
      paymentMethod: 'dinheiro',
      paymentDate: formatDateTimeInput(new Date()),
      notes: '',
    });
  };

  const openPostponeDialog = (sale: CreditSale) => {
    const chargeDate = (() => {
      const parsed = parseISO(sale.chargeDate);
      return isValid(parsed) ? formatDateInput(parsed) : formatDateInput(new Date());
    })();

    setSelectedSale(sale);
    setActionType('postpone');
    setPostponeForm({
      chargeDate,
      reminderDays: sale.reminderPreferences?.daysBefore ?? 0,
      notes: '',
    });
  };

  const closeDialog = () => {
    setSelectedSale(null);
    setActionType(null);
    setIsProcessingAction(false);
    setPaymentForm({
      paymentMethod: 'dinheiro',
      paymentDate: formatDateTimeInput(new Date()),
      notes: '',
    });
    setPostponeForm({
      chargeDate: formatDateInput(new Date()),
      reminderDays: 0,
      notes: '',
    });
  };

  const handleConfirmPayment = async () => {
    if (!selectedSale?.id) {
      return;
    }

    setIsProcessingAction(true);
    try {
      const paymentDateISO = parseDateInput(paymentForm.paymentDate);
      const sale = creditSales.find(s => s.id === selectedSale.id);
      if (!sale) return;
      
      const result = await registerPayment(selectedSale.id, {
        amount: sale.remainingAmount ?? sale.total,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentDateISO,
        sessionId: currentSession?.id,
        notes: paymentForm.notes?.trim() || null,
      });

      if (result) {
        toast({
          title: 'Venda concluída',
          description: 'O pagamento da venda a prazo foi registrado com sucesso.',
        });
        await reloadTransactions();
        closeDialog();
      }
    } catch (error) {
      console.error('Erro ao concluir venda a prazo:', error);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmPostpone = async () => {
    if (!selectedSale?.id) {
      return;
    }

    setIsProcessingAction(true);
    try {
      const chargeDateISO = parseDateInput(postponeForm.chargeDate);
      const reminderPreferences = selectedSale.reminderPreferences
        ? {
            ...selectedSale.reminderPreferences,
            daysBefore: postponeForm.reminderDays,
          }
        : {
            enabled: true,
            daysBefore: postponeForm.reminderDays,
            remindAt: null,
          };

      const result = await postponeCreditSale(selectedSale.id, {
        chargeDate: chargeDateISO,
        reminderPreferences,
        notes: postponeForm.notes?.trim() || null,
      });

      if (result) {
        toast({
          title: 'Cobrança atualizada',
          description: 'A data de cobrança foi atualizada com sucesso.',
        });
        closeDialog();
      }
    } catch (error) {
      console.error('Erro ao adiar cobrança da venda a prazo:', error);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      venda: 'Venda',
      entrada: 'Entrada',
      saida: 'Saída',
      despesa: 'Despesa',
    } as const;
    return labels[type as keyof typeof labels] || type;
  };

  const getTransactionColor = (type: string) => {
    const colors = {
      venda: 'text-emerald-600',
      entrada: 'text-blue-600',
      saida: 'text-orange-600',
      despesa: 'text-red-600',
    } as const;
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  const renderAlertContent = () => {
    if (creditSalesLoading) {
      return <p className="text-sm text-muted-foreground">Carregando alertas...</p>;
    }

    if (alertSales.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm text-center max-w-xs">
            Nenhuma cobrança precisa da sua atenção agora. Ajuste os filtros para consultar outras vendas.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {alertSales.map((sale) => {
          const dueDate = parseISO(sale.chargeDate);
          const isOverdue = isValid(dueDate) && isBefore(dueDate, startOfDay(new Date()));
          const daysUntil = isValid(dueDate)
            ? differenceInCalendarDays(dueDate, new Date())
            : undefined;

          return (
            <div
              key={sale.id}
              className="rounded-lg border border-border bg-muted/40 p-3 sm:p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{sale.customerName}</p>
                    <p className="text-xs text-muted-foreground">{sale.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {isValid(dueDate) && (
                      <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {`Vencimento: ${format(dueDate, 'dd/MM/yyyy')}`}
                      </Badge>
                    )}
                    <Badge variant="outline">R$ {sale.total.toFixed(2)}</Badge>
                    {typeof daysUntil === 'number' && !Number.isNaN(daysUntil) && (
                      <Badge variant="outline">
                        {daysUntil === 0
                          ? 'Vence hoje'
                          : daysUntil < 0
                          ? `${Math.abs(daysUntil)} dia(s) em atraso`
                          : `Faltam ${daysUntil} dia(s)`}
                      </Badge>
                    )}
                    {sale.reminderPreferences && sale.reminderPreferences.daysBefore > 0 && (
                      <Badge variant="outline">
                        Lembrar {sale.reminderPreferences.daysBefore} dia(s) antes
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" onClick={() => openPaymentDialog(sale)}>
                    Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPostponeDialog(sale)}
                  >
                    Adiar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Bem-vindo ao Sistema Lojista</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Sistema de vendas e ordens de serviço
        </p>
      </div>

      {/* Cash Session Manager */}
      <CashSessionManager onSessionChange={setCurrentSession} />

      {/* Today's Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="hs-card">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">Transações Hoje</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">{todayStats.transactions}</p>
            </div>
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
          </CardContent>
        </Card>

        <Card className="hs-card">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">Vendas Hoje</p>
              <p className="text-xl sm:text-2xl font-bold text-secondary truncate">
                R$ {todayStats.sales.toFixed(2)}
              </p>
            </div>
            <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-secondary flex-shrink-0" />
          </CardContent>
        </Card>

        <Card className="hs-card sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">OS Abertas</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{todayStats.openOrders}</p>
            </div>
            <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0" />
          </CardContent>
        </Card>
      </div>


      {/* Recent Activity Preview */}
      <Card className="hs-card">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-medium text-xs sm:text-sm truncate">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                      <span className={`${getTransactionColor(transaction.type)} truncate`}>
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">
                        {format(new Date(transaction.createdAt), 'dd/MM HH:mm')}
                      </span>
                      <span className="sm:hidden">
                        {format(new Date(transaction.createdAt), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-xs sm:text-sm ${getTransactionColor(transaction.type)}`}>
                      R$ {transaction.total.toFixed(2)}
                    </p>
                    {transaction.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">{transaction.quantity}x</p>
                    )}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-3 sm:mt-4 text-sm"
                onClick={() => navigate('/transactions')}
              >
                <span className="hidden sm:inline">Ver Todas as Transações</span>
                <span className="sm:hidden">Ver Todas</span>
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <FileText className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">Suas transações recentes aparecerão aqui</p>
              <Button
                variant="outline"
                className="mt-3 sm:mt-4 text-sm"
                onClick={() => navigate('/transactions')}
              >
                <span className="hidden sm:inline">Ver Todas as Transações</span>
                <span className="sm:hidden">Ver Todas</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(actionType)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          {actionType === 'complete' && selectedSale ? (
            <>
              <DialogHeader>
                <DialogTitle>Concluir venda a prazo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Forma de pagamento</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value: PaymentMethod) =>
                      setPaymentForm((prev) => ({ ...prev, paymentMethod: value }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data do pagamento</Label>
                  <Input
                    type="datetime-local"
                    value={paymentForm.paymentDate}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentDate: event.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Detalhes adicionais sobre o pagamento"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeDialog} disabled={isProcessingAction}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmPayment} disabled={isProcessingAction}>
                  Registrar pagamento
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {actionType === 'postpone' && selectedSale ? (
            <>
              <DialogHeader>
                <DialogTitle>Adiar cobrança</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nova data de cobrança</Label>
                  <Input
                    type="date"
                    value={postponeForm.chargeDate}
                    onChange={(event) =>
                      setPostponeForm((prev) => ({
                        ...prev,
                        chargeDate: event.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Dias de antecedência para lembrete</Label>
                  <Input
                    type="number"
                    min={0}
                    value={postponeForm.reminderDays}
                    onChange={(event) =>
                      setPostponeForm((prev) => ({
                        ...prev,
                        reminderDays: Number.parseInt(event.target.value, 10) || 0,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={postponeForm.notes}
                    onChange={(event) =>
                      setPostponeForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Motivo do adiamento ou instruções adicionais"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeDialog} disabled={isProcessingAction}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmPostpone} disabled={isProcessingAction}>
                  Atualizar cobrança
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
