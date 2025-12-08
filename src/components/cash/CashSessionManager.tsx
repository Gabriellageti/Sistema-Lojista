// Sistema Lojista - Cash Session Manager

import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCashSessions } from '@/hooks/useCashSessions';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditSales } from '@/hooks/useCreditSales';
import { CashSession } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { filterSettledTransactions } from '@/utils/creditSalesUtils';

interface CashSessionManagerProps {
  onSessionChange: (session: CashSession | null) => void;
}

const CashSessionManager = ({ onSessionChange }: CashSessionManagerProps) => {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return (
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    );
  });
  const [initialAmount, setInitialAmount] = useState('100');
  const { toast } = useToast();

  const { currentSession, sessions, saveSession } = useCashSessions();
  const { transactions } = useTransactions();
  const { creditSales } = useCreditSales();

  useEffect(() => {
    onSessionChange(currentSession);
  }, [currentSession, onSessionChange]);

  const handleOpenSession = async () => {
    // Check if session already exists for this date
    const existingSession = sessions.find((s) => s.date === date);

    if (existingSession && existingSession.isOpen) {
      toast({
        title: 'Sessão já existe',
        description: 'Já existe uma sessão aberta para esta data.',
        variant: 'destructive',
      });
      return;
    }

    const parsedInitialAmount = parseFloat(initialAmount) || 0;

    const newSession: CashSession = {
      date,
      initialAmount: parsedInitialAmount,
      isOpen: true,
      openedAt: new Date().toISOString(),
      totalSales: 0,
      totalEntries: 0,
      totalExits: 0,
      totalExpenses: 0,
      isClosed: false,
    };

    // Close any existing open sessions
    for (const session of sessions) {
      if (session.isOpen) {
        const closedSession = {
          ...session,
          isOpen: false,
          closedAt: new Date().toISOString(),
          isClosed: true,
        };
        const updatedSession = await saveSession(closedSession);
        if (!updatedSession) {
          // manter o diálogo aberto para o usuário ajustar/tentar de novo
          setShowOpenDialog(true);
          toast({
            title: 'Erro',
            description: 'Não foi possível atualizar a sessão de caixa existente.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    if (existingSession) {
      const reopenedSession: CashSession = {
        ...existingSession,
        initialAmount: parsedInitialAmount,
        isOpen: true,
        openedAt: new Date().toISOString(),
        closedAt: undefined,
        finalAmount: undefined,
        isClosed: false,
      };

      const savedSession = await saveSession(reopenedSession);

      if (!savedSession) {
        setShowOpenDialog(true);
        toast({
          title: 'Erro',
          description: 'Não foi possível reabrir a sessão existente. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      setShowOpenDialog(false);

      toast({
        title: 'Sessão reaberta',
        description: `Caixa reaberto para ${date.split('-').reverse().join('/')}`,
      });
      return;
    }

    const savedSession = await saveSession(newSession);

    if (!savedSession) {
      // manter o diálogo aberto para o usuário ajustar/tentar de novo
      setShowOpenDialog(true);
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o caixa. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setShowOpenDialog(false);

    toast({
      title: 'Sessão aberta',
      description: `Caixa aberto para ${date.split('-').reverse().join('/')}`,
    });
  };

  const calculateSessionTotals = () => {
    if (!currentSession) return null;

    const settledTransactions = filterSettledTransactions(transactions, creditSales);
    const sessionTransactions = currentSession.id
      ? settledTransactions.filter((t) => t.sessionId === currentSession.id)
      : [];

    const totals = sessionTransactions.reduce(
      (acc, transaction) => {
        switch (transaction.type) {
          case 'venda':
          case 'entrada':
            acc.sales += transaction.total;
            acc.salesCount++;
            break;
          case 'saida':
            acc.exits += transaction.total;
            break;
          case 'despesa':
            acc.expenses += transaction.total;
            break;
        }
        return acc;
      },
      { sales: 0, exits: 0, expenses: 0, salesCount: 0 }
    );

    const finalAmount =
      currentSession.initialAmount +
      totals.sales -
      totals.exits -
      totals.expenses;
    const averageTicket = totals.salesCount > 0 ? totals.sales / totals.salesCount : 0;

    return { ...totals, finalAmount, averageTicket };
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;

    if (!currentSession.id) {
      toast({
        title: 'Erro',
        description: 'Não foi possível identificar a sessão atual para fechamento.',
        variant: 'destructive',
      });
      return;
    }

    const totals = calculateSessionTotals();
    if (!totals) return;

    const updatedSession: CashSession = {
      ...currentSession,
      isOpen: false,
      isClosed: true,
      closedAt: new Date().toISOString(),
      totalSales: totals.sales,
      totalEntries: 0,
      totalExits: totals.exits,
      totalExpenses: totals.expenses,
      finalAmount: totals.finalAmount,
      salesCount: totals.salesCount,
      averageTicket: totals.averageTicket,
    };

    const savedSession = await saveSession(updatedSession);

    if (!savedSession) {
      toast({
        title: 'Erro',
        description: 'Não foi possível fechar o caixa. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sessão fechada',
      description: `Caixa fechado. Valor final: R$ ${totals.finalAmount.toFixed(2)}`,
    });
  };

  if (currentSession) {
    const totals = calculateSessionTotals();

    return (
      <Card className="hs-card">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Sessão de Caixa Aberta</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground text-xs sm:text-sm">Data</Label>
              <p className="font-medium">
                {currentSession.date.split('-').reverse().join('/')}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs sm:text-sm">Valor Inicial</Label>
              <p className="font-medium">R$ {currentSession.initialAmount.toFixed(2)}</p>
            </div>
          </div>

          {totals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
              <div className="text-center p-2 sm:p-3 bg-emerald-50 rounded-lg">
                <p className="text-emerald-600 font-bold text-sm sm:text-base truncate">
                  R$ {totals.sales.toFixed(2)}
                </p>
                <p className="text-emerald-700 text-xs">Vendas</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                <p className="text-orange-600 font-bold text-sm sm:text-base truncate">
                  R$ {totals.exits.toFixed(2)}
                </p>
                <p className="text-orange-700 text-xs">Saídas</p>
              </div>
            </div>
          )}

          {totals && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-primary/5 rounded-lg gap-2 sm:gap-0">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Valor Final</p>
                <p className="text-lg sm:text-xl font-bold text-primary">
                  R$ {totals.finalAmount.toFixed(2)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-base sm:text-lg font-semibold">
                  R$ {totals.averageTicket.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={() => window.location.href = '/cash-closing'}
            className="w-full text-sm sm:text-base"
          >
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            <span className="hidden sm:inline">Fechar Caixa</span>
            <span className="sm:hidden">Fechar</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hs-card">
      <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 px-4">
        <Lock className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-semibold mb-2">Caixa Fechado</h3>
        <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6">
          Abra uma sessão de caixa para começar a registrar movimentações
        </p>

        {!showOpenDialog ? (
          <Button
            onClick={() => setShowOpenDialog(true)}
            variant="hero"
            size="lg"
            className="text-sm sm:text-base"
          >
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Abrir Caixa
          </Button>
        ) : (
          <div className="w-full max-w-sm space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="date" className="text-xs sm:text-sm">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="initialAmount" className="text-xs sm:text-sm">Valor Inicial (R$)</Label>
              <Input
                id="initialAmount"
                type="number"
                step="0.01"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="100.00"
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenSession} className="flex-1 text-sm">
                Confirmar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowOpenDialog(false)}
                className="flex-1 text-sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CashSessionManager;
