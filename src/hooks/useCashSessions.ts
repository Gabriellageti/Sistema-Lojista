import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CashSession } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useCashSessions = () => {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const normalizeSessionTotals = (totalSales: unknown, totalEntries: unknown) => {
    const parsedSales = Number(totalSales ?? 0);
    const parsedEntries = Number(totalEntries ?? 0);
    const salesValue = Number.isFinite(parsedSales) ? parsedSales : 0;
    const entriesValue = Number.isFinite(parsedEntries) ? parsedEntries : 0;

    if (!salesValue && !entriesValue) {
      return { totalSales: 0, totalEntries: 0 };
    }

    if (!salesValue || !entriesValue) {
      return { totalSales: Math.max(salesValue, entriesValue), totalEntries: 0 };
    }

    if (Math.abs(salesValue - entriesValue) < 0.01) {
      return { totalSales: Math.max(salesValue, entriesValue), totalEntries: 0 };
    }

    return { totalSales: salesValue + entriesValue, totalEntries: 0 };
  };

  const mapSession = (session: any): CashSession => {
    const normalizedTotals = normalizeSessionTotals(
      session.total_sales,
      session.total_entries
    );

    return {
      id: session.id,
      date: session.date,
      initialAmount: Number(session.initial_amount ?? 0),
      isOpen: !!session.is_open,
      isClosed: !!(session.is_closed ?? false),
      openedAt: session.opened_at,
      closedAt: session.closed_at ?? undefined,
      deletedAt: session.deleted_at ?? undefined,
      totalSales: normalizedTotals.totalSales,
      totalEntries: normalizedTotals.totalEntries,
      totalExits: Number(session.total_exits ?? 0),
      totalExpenses: Number(session.total_expenses ?? 0),
      finalAmount:
        session.final_amount === null || session.final_amount === undefined
          ? undefined
          : Number(session.final_amount),
      salesCount: session.sales_count ?? undefined,
      averageTicket:
        session.average_ticket === null || session.average_ticket === undefined
          ? undefined
          : Number(session.average_ticket),
    };
  };

  // Load all sessions
  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedSessions = (data ?? []).map(mapSession);
      setSessions(mappedSessions);

      // Set current session (the open one)
      const openSession = mappedSessions.find((s) => s.isOpen);
      setCurrentSession(openSession || null);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar sessões de caixa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save or update session
  const saveSession = async (session: CashSession): Promise<CashSession | null> => {
    try {
      const normalizedTotals = normalizeSessionTotals(
        session.totalSales,
        session.totalEntries
      );

      const sessionData: Record<string, any> = {
        date: session.date,
        initial_amount: session.initialAmount,
        is_open: session.isOpen,
        is_closed: session.isClosed ?? false,
        opened_at: session.openedAt,
        closed_at: session.closedAt ?? null,
        deleted_at: session.deletedAt ?? null,
        total_sales: normalizedTotals.totalSales,
        total_entries: normalizedTotals.totalEntries,
        total_exits: session.totalExits,
        total_expenses: session.totalExpenses,
        final_amount: session.finalAmount ?? null,
        sales_count: session.salesCount ?? null,
        average_ticket: session.averageTicket ?? null,
      };

      let resp;
      if (session.id) {
        resp = await supabase
          .from('cash_sessions')
          .update(sessionData)
          .eq('id', session.id)
          .select()
          .single();
      } else {
        resp = await supabase
          .from('cash_sessions')
          .insert([sessionData] as any)
          .select()
          .single();
      }

      const { data, error } = resp;
      if (error) throw error;

      // Recarrega lista/atual
      await loadSessions();

      return data ? mapSession(data) : null;
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar sessão de caixa',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o fechamento de caixa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const restoreSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({ deleted_at: null })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      return true;
    } catch (error) {
      console.error('Error restoring session:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível restaurar o fechamento de caixa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const purgeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('cash_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      return true;
    } catch (error) {
      console.error('Error purging session:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover definitivamente o fechamento de caixa.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get current session
  const getCurrentSession = () => currentSession;

  // Get all sessions
  const getCashSessions = () => sessions;

  useEffect(() => {
    loadSessions();
  }, []);

  return {
    sessions,
    currentSession,
    loading,
    saveSession,
    deleteSession,
    restoreSession,
    purgeSession,
    getCurrentSession,
    getCashSessions,
    reload: loadSessions,
  };
};
