import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TrashItemType = 'cash_session' | 'service_order' | 'transaction';

export interface TrashItemSummaryField {
  label: string;
  value: string;
}

export interface TrashItemSummary {
  title: string;
  subtitle?: string;
  description?: string;
  details: TrashItemSummaryField[];
}

export interface TrashItem {
  id: string;
  type: TrashItemType;
  deletedAt: string;
  deletedAtLabel: string;
  summary: TrashItemSummary;
}

export interface EmptyTrashResult {
  sessionsRemoved: number;
  ordersRemoved: number;
  transactionsRemoved: number;
}

type CashSessionRow = Database['public']['Tables']['cash_sessions']['Row'];
type ServiceOrderRow = Database['public']['Tables']['service_orders']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];

const TRANSACTION_METADATA_PREFIX = '__HS_ITEMS_META__:' as const;

type DetailInput = TrashItemSummaryField | null | undefined;

const isMissingColumnError = (error: unknown, column: string) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const knownCodes = new Set(['42703', 'pgrst200', 'pgrst102', 'pgrst204']);
  const normalize = (value: unknown) =>
    typeof value === 'string' ? value.toLowerCase() : '';

  const baseError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    error?: unknown;
  };

  const columnName = column.toLowerCase();

  const codesToInspect = [
    normalize(baseError.code),
    normalize((baseError.error as { code?: unknown } | undefined)?.code),
  ];

  if (codesToInspect.some(code => knownCodes.has(code))) {
    return true;
  }

  const textFragments: string[] = [];
  const collectText = (value: unknown) => {
    if (typeof value === 'string' && value) {
      textFragments.push(value.toLowerCase());
    }
  };

  collectText(baseError.message);
  collectText(baseError.details);
  collectText(baseError.hint);

  const nestedError = baseError.error as
    | { message?: unknown; details?: unknown; hint?: unknown }
    | undefined;

  if (nestedError && typeof nestedError === 'object') {
    collectText(nestedError.message);
    collectText(nestedError.details);
    collectText(nestedError.hint);
  }

  if (textFragments.length === 0) {
    return false;
  }

  const combined = textFragments.join(' ');

  if (!combined.includes(columnName)) {
    return false;
  }

  return (
    combined.includes('column') &&
    (combined.includes('does not exist') ||
      combined.includes('not exist') ||
      combined.includes('not found') ||
      combined.includes('missing column') ||
      combined.includes('undefined column'))
  );
};

const isMissingDeletedAtColumnError = (error: unknown) =>
  isMissingColumnError(error, 'deleted_at');

const formatCurrency = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
};

const parseDateValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatDate = (value?: string | null) => {
  const date = parseDateValue(value);

  if (!date) {
    return value ?? '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const buildDetails = (...fields: DetailInput[]): TrashItemSummaryField[] =>
  fields.filter((field): field is TrashItemSummaryField => Boolean(field?.value));

const mapSessionToTrashItem = (session: CashSessionRow): TrashItem => {
  const deletedAt = session.deleted_at ?? session.updated_at;
  const titleDate = formatDate(session.date ?? session.created_at);

  return {
    id: session.id,
    type: 'cash_session',
    deletedAt,
    deletedAtLabel: formatDateTime(deletedAt),
    summary: {
      title: 'Sessão de caixa',
      subtitle: titleDate ? `Data: ${titleDate}` : undefined,
      description: session.is_open
        ? 'Sessão ainda marcada como aberta'
        : session.is_closed
          ? 'Sessão encerrada'
          : undefined,
      details: buildDetails(
        {
          label: 'Valor inicial',
          value: formatCurrency(session.initial_amount),
        },
        {
          label: 'Total de vendas',
          value: formatCurrency(session.total_sales),
        },
        session.final_amount !== null && session.final_amount !== undefined
          ? {
              label: 'Total final',
              value: formatCurrency(session.final_amount),
            }
          : null,
        session.closed_at
          ? {
              label: 'Fechada em',
              value: formatDateTime(session.closed_at),
            }
          : null,
      ),
    },
  };
};

const normalizeStatus = (status: string) => {
  if (!status) {
    return '-';
  }

  const lower = status.toLowerCase();

  switch (lower) {
    case 'aberta':
      return 'Aberta';
    case 'concluida':
      return 'Concluída';
    case 'cancelada':
      return 'Cancelada';
    default:
      return status;
  }
};

const mapOrderToTrashItem = (order: ServiceOrderRow): TrashItem => {
  const deletedAt = order.deleted_at ?? order.updated_at;
  const customerName = order.customer_name?.trim() || 'Cliente não informado';

  return {
    id: order.id,
    type: 'service_order',
    deletedAt,
    deletedAtLabel: formatDateTime(deletedAt),
    summary: {
      title: customerName,
      subtitle: `${formatCurrency(order.value)} • ${normalizeStatus(order.status as string)}`,
      description: order.description,
      details: buildDetails(
        order.customer_phone
          ? {
              label: 'Telefone',
              value: order.customer_phone,
            }
          : null,
        {
          label: 'Criada em',
          value: formatDateTime(order.created_at),
        },
        {
          label: 'Atualizada em',
          value: formatDateTime(order.updated_at),
        },
        order.estimated_deadline
          ? {
              label: 'Prazo estimado',
              value: formatDateTime(order.estimated_deadline),
            }
          : null,
      ),
    },
  };
};

const formatTransactionType = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const normalized = value.toLowerCase();

  switch (normalized) {
    case 'entrada':
      return 'Entrada';
    case 'saida':
      return 'Saída';
    case 'venda':
      return 'Venda';
    case 'despesa':
      return 'Despesa';
    default:
      return value;
  }
};

const formatPaymentMethod = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const normalized = value.toLowerCase();

  switch (normalized) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return 'Pix';
    case 'cartao_debito':
      return 'Cartão de débito';
    case 'cartao_credito':
      return 'Cartão de crédito';
    case 'outros':
      return 'Outros';
    default:
      return value;
  }
};

const extractTransactionMetadata = (
  notes: string | null
): { note?: string; itemsCount?: number } => {
  if (!notes) {
    return {};
  }

  const trimmedNotes = notes.trim();

  if (!trimmedNotes) {
    return {};
  }

  if (!trimmedNotes.startsWith(TRANSACTION_METADATA_PREFIX)) {
    return { note: trimmedNotes };
  }

  try {
    const parsed = JSON.parse(trimmedNotes.slice(TRANSACTION_METADATA_PREFIX.length)) as {
      note?: unknown;
      items?: unknown;
    };

    const metadata: { note?: string; itemsCount?: number } = {};

    if (typeof parsed.note === 'string' && parsed.note.trim()) {
      metadata.note = parsed.note.trim();
    }

    if (Array.isArray(parsed.items)) {
      const validItems = parsed.items.filter(Boolean);
      if (validItems.length > 0) {
        metadata.itemsCount = validItems.length;
      }
    }

    return metadata;
  } catch {
    return {};
  }
};

const mapTransactionToTrashItem = (transaction: TransactionRow): TrashItem => {
  const deletedAt = transaction.deleted_at ?? transaction.updated_at ?? transaction.created_at;
  const typeLabel = formatTransactionType(transaction.type as string);
  const paymentLabel = formatPaymentMethod(transaction.payment_method as string);
  const metadata = extractTransactionMetadata(transaction.notes);
  const subtitleParts = [formatCurrency(transaction.total), typeLabel].filter(Boolean);
  const itemsCountLabel =
    typeof metadata.itemsCount === 'number' && metadata.itemsCount > 0
      ? `${metadata.itemsCount} item${metadata.itemsCount > 1 ? 's' : ''}`
      : null;

  return {
    id: transaction.id,
    type: 'transaction',
    deletedAt,
    deletedAtLabel: formatDateTime(deletedAt),
    summary: {
      title: transaction.description?.trim() || 'Lançamento sem descrição',
      subtitle: subtitleParts.length > 0 ? subtitleParts.join(' • ') : undefined,
      description: metadata.note,
      details: buildDetails(
        typeLabel
          ? {
              label: 'Tipo',
              value: typeLabel,
            }
          : null,
        {
          label: 'Valor total',
          value: formatCurrency(transaction.total),
        },
        paymentLabel
          ? {
              label: 'Forma de pagamento',
              value: paymentLabel,
            }
          : null,
        transaction.session_id
          ? {
              label: 'Sessão de caixa',
              value: transaction.session_id,
            }
          : null,
        transaction.service_order_id
          ? {
              label: 'Ordem de serviço',
              value: transaction.service_order_id,
            }
          : null,
        {
          label: 'Criado em',
          value: formatDateTime(transaction.created_at),
        },
        transaction.updated_at
          ? {
              label: 'Atualizado em',
              value: formatDateTime(transaction.updated_at),
            }
          : null,
        itemsCountLabel
          ? {
              label: 'Itens registrados',
              value: itemsCountLabel,
            }
          : null,
      ),
    },
  };
};

export const useTrash = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrash = useCallback(async () => {
    setLoading(true);

    try {
      const [sessionsResponse, ordersResponse, transactionsResponse] = await Promise.all([
        supabase
          .from('cash_sessions')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
        supabase
          .from('service_orders')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
      ]);

      if (sessionsResponse.error) {
        throw sessionsResponse.error;
      }

      if (ordersResponse.error) {
        throw ordersResponse.error;
      }

      const sessionItems = (sessionsResponse.data ?? []).map(mapSessionToTrashItem);
      const orderItems = (ordersResponse.data ?? []).map(mapOrderToTrashItem);

      let transactionItems: TrashItem[] = [];
      if (transactionsResponse.error) {
        // Se a tabela de transactions ainda não tem deleted_at, seguimos sem quebrar
        if (!isMissingDeletedAtColumnError(transactionsResponse.error)) {
          throw transactionsResponse.error;
        }
      } else {
        transactionItems = (transactionsResponse.data ?? []).map(mapTransactionToTrashItem);
      }

      const combined = [...sessionItems, ...orderItems, ...transactionItems].sort((a, b) => {
        const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return bTime - aTime;
      });

      setItems(combined);
    } catch (error) {
      console.error('Erro ao carregar itens da lixeira:', error);
      toast({
        title: 'Erro ao carregar lixeira',
        description: 'Não foi possível carregar os itens removidos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const restoreSession = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('cash_sessions')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }, []);

  const restoreServiceOrder = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('service_orders')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }, []);

  const restoreTransaction = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      // se a coluna não existe ainda, não quebramos
      if (!isMissingDeletedAtColumnError(error)) {
        throw error;
      }
    }
  }, []);

  const restoreItem = useCallback(
    async (item: TrashItem): Promise<boolean> => {
      try {
        if (item.type === 'cash_session') {
          await restoreSession(item.id);
        } else if (item.type === 'service_order') {
          await restoreServiceOrder(item.id);
        } else {
          await restoreTransaction(item.id);
        }

        await loadTrash();
        return true;
      } catch (error) {
        console.error('Erro ao restaurar item da lixeira:', error);
        toast({
          title: 'Não foi possível restaurar',
          description: 'Ocorreu um erro ao tentar restaurar o item selecionado.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [loadTrash, restoreServiceOrder, restoreSession, restoreTransaction, toast],
  );

  const emptyTrash = useCallback(async (): Promise<EmptyTrashResult | null> => {
    try {
      const [
        { data: deletedSessions, error: sessionSelectError },
        { data: deletedOrders, error: orderSelectError },
        { data: deletedTransactions, error: transactionSelectError },
      ] = await Promise.all([
        supabase.from('cash_sessions').select('id').not('deleted_at', 'is', null),
        supabase.from('service_orders').select('id').not('deleted_at', 'is', null),
        supabase.from('transactions').select('id').not('deleted_at', 'is', null),
      ]);

      if (sessionSelectError) {
        throw sessionSelectError;
      }

      if (orderSelectError) {
        throw orderSelectError;
      }

      const missingDeletedAtForTransactions =
        Boolean(transactionSelectError) &&
        isMissingDeletedAtColumnError(transactionSelectError);

      if (transactionSelectError && !missingDeletedAtForTransactions) {
        throw transactionSelectError;
      }

      let sessionsRemoved = 0;
      if (deletedSessions && deletedSessions.length > 0) {
        const sessionIds = deletedSessions.map(session => session.id);
        const { error: sessionDeleteError } = await supabase
          .from('cash_sessions')
          .delete()
          .in('id', sessionIds);

        if (sessionDeleteError) {
          throw sessionDeleteError;
        }

        sessionsRemoved = sessionIds.length;
      }

      let transactionsRemoved = 0;
      const transactionsToRemove = missingDeletedAtForTransactions
        ? []
        : deletedTransactions ?? [];

      if (transactionsToRemove.length > 0) {
        const transactionIds = transactionsToRemove.map(transaction => transaction.id);
        const { data: removedTransactions, error: transactionDeleteError } = await supabase
          .from('transactions')
          .delete()
          .in('id', transactionIds)
          .select('id');

        if (transactionDeleteError) {
          // Se a coluna não existe, consideramos que já não precisamos apagar por aqui
          if (!isMissingDeletedAtColumnError(transactionDeleteError)) {
            throw transactionDeleteError;
          }
          transactionsRemoved += transactionIds.length;
        } else {
          transactionsRemoved += removedTransactions?.length ?? transactionIds.length;
        }
      }

      let ordersRemoved = 0;
      if (deletedOrders && deletedOrders.length > 0) {
        const orderIds = deletedOrders.map(order => order.id);

        const { data: relatedTransactions, error: transactionDeleteError } = await supabase
          .from('transactions')
          .delete()
          .in('service_order_id', orderIds)
          .select('id');

        if (transactionDeleteError) {
          if (!isMissingDeletedAtColumnError(transactionDeleteError)) {
            throw transactionDeleteError;
          }
        } else {
          transactionsRemoved += relatedTransactions?.length ?? 0;
        }

        const { error: orderDeleteError } = await supabase
          .from('service_orders')
          .delete()
          .in('id', orderIds);

        if (orderDeleteError) {
          throw orderDeleteError;
        }

        ordersRemoved = orderIds.length;
      }

      await loadTrash();

      return {
        sessionsRemoved,
        ordersRemoved,
        transactionsRemoved,
      };
    } catch (error) {
      console.error('Erro ao esvaziar lixeira:', error);
      toast({
        title: 'Não foi possível esvaziar a lixeira',
        description: 'Revise sua conexão e tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  }, [loadTrash, toast]);

  const groupedItems = useMemo(() => items, [items]);

  return {
    items: groupedItems,
    loading,
    restoreItem,
    emptyTrash,
    reload: loadTrash,
  };
};
