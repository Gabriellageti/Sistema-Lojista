import { useState, useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import {
  Transaction,
  TransactionInput,
  TransactionItem,
  PaymentSplit,
  PaymentMethod,
} from '@/types';
import { useToast } from '@/hooks/use-toast';

const safeClone = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }

  const globalStructuredClone = (globalThis as typeof globalThis & {
    structuredClone?: <CloneT>(value: CloneT) => CloneT;
  }).structuredClone;

  if (typeof globalStructuredClone === 'function') {
    return globalStructuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const METADATA_PREFIX = '__HS_ITEMS_META__:' as const;

type TransactionMetadataPayload = {
  version: 1;
  note?: string;
  items?: TransactionItem[];
};

const sanitizeItems = (
  items: TransactionItem[] | null | undefined
): TransactionItem[] | undefined => {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }

  const sanitized = items
    .map(item => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const total = Number(item.total ?? quantity * unitPrice) || 0;
      const description = typeof item.description === 'string' ? item.description.trim() : '';

      if (!description) {
        return null;
      }

      return {
        description,
        quantity,
        unitPrice,
        total,
      } as TransactionItem;
    })
    .filter((item): item is TransactionItem => item !== null);

  return sanitized.length > 0 ? sanitized : undefined;
};

const encodeMetadata = (
  note: string | undefined,
  items: TransactionItem[] | null | undefined
): string | null => {
  const trimmedNote = note?.trim();
  const sanitizedItems = sanitizeItems(items);

  if (!trimmedNote && !sanitizedItems) {
    return null;
  }

  const payload: TransactionMetadataPayload = { version: 1 };

  if (trimmedNote) {
    payload.note = trimmedNote;
  }

  if (sanitizedItems) {
    payload.items = sanitizedItems;
  }

  return `${METADATA_PREFIX}${JSON.stringify(payload)}`;
};

const decodeMetadata = (
  value: string | null | undefined
): { note?: string; items?: TransactionItem[] } | null => {
  if (!value || !value.startsWith(METADATA_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.slice(METADATA_PREFIX.length)) as TransactionMetadataPayload;

    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return null;
    }

    const note = typeof parsed.note === 'string' ? parsed.note : undefined;
    const items = sanitizeItems(parsed.items);

    if (!note && !items) {
      return null;
    }

    return { note, items };
  } catch (error) {
    console.error('Failed to parse transaction metadata:', error);
    return null;
  }
};

const isMissingColumnError = (
  error: unknown,
  columnName: string,
  tableName = 'transactions'
) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const normalizedStrings: string[] = [];
  const collectString = (value: unknown) => {
    if (typeof value === 'string' && value) {
      normalizedStrings.push(value.toLowerCase());
    }
  };

  const knownCodes = new Set(['42703', 'pgrst200', 'pgrst102', 'pgrst204']);

  const extractCode = (value: unknown) =>
    typeof value === 'string' ? value.toLowerCase() : '';

  const baseError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    error?: unknown;
  };

  const primaryCode = extractCode(baseError.code);
  if (knownCodes.has(primaryCode)) {
    return true;
  }

  collectString(baseError.message);
  collectString(baseError.details);
  collectString(baseError.hint);

  const nestedError = baseError.error as
    | { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }
    | undefined;

  if (nestedError && typeof nestedError === 'object') {
    const nestedCode = extractCode(nestedError.code);
    if (knownCodes.has(nestedCode)) {
      return true;
    }

    collectString(nestedError.message);
    collectString(nestedError.details);
    collectString(nestedError.hint);
  }

  if (normalizedStrings.length === 0) {
    return false;
  }

  const combined = normalizedStrings.join(' ');

  const mentionsMissingColumn =
    combined.includes('column') &&
    (combined.includes('does not exist') ||
      combined.includes('not exist') ||
      combined.includes('not found') ||
      combined.includes('undefined column') ||
      combined.includes('missing column'));

  if (!mentionsMissingColumn) {
    return false;
  }

  const normalizedColumnName = columnName.toLowerCase();
  if (normalizedColumnName && combined.includes(normalizedColumnName)) {
    return true;
  }

  if (!tableName) {
    return false;
  }

  const normalizedTableName = tableName.toLowerCase();

  return (
    combined.includes(normalizedTableName) ||
    combined.includes(`public.${normalizedTableName}`)
  );
};

const isMissingItemsColumnError = (error: unknown) =>
  isMissingColumnError(error, 'items');

const isMissingDeletedAtColumnError = (error: unknown) =>
  isMissingColumnError(error, 'deleted_at');

type SupabaseTransactionRow = Database['public']['Tables']['transactions']['Row'];

const normalizeTimestamp = (value?: string) => {
  if (!value) return undefined;

  const normalizedInput = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalizedInput);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

export const useTransactions = (options?: { autoLoad?: boolean }) => {
  const autoLoad = options?.autoLoad ?? true;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const normalizeItems = (
    fallback: {
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }
  ): TransactionItem[] | undefined => {
    return fallback.description
      ? [
          {
            description: fallback.description,
            quantity: fallback.quantity,
            unitPrice: fallback.unitPrice,
            total: fallback.total,
          },
        ]
      : undefined;
  };

  const validMethods: PaymentMethod[] = [
    'dinheiro',
    'pix',
    'cartao_debito',
    'cartao_credito',
    'outros',
  ];
  const isPaymentMethod = (value: unknown): value is PaymentMethod =>
    typeof value === 'string' && (validMethods as string[]).includes(value);

  const normalizePaymentSplits = (
    paymentSplits: SupabaseTransactionRow['payment_splits']
  ): PaymentSplit[] | undefined => {
    if (!paymentSplits) {
      return undefined;
    }

    let parsed: unknown = paymentSplits;

    if (typeof paymentSplits === 'string') {
      try {
        parsed = JSON.parse(paymentSplits);
      } catch (error) {
        console.error('Error parsing transaction payment splits JSON:', error);
        parsed = undefined;
      }
    }

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed
      .map((split) => {
        const method = (split as { method?: unknown })?.method;
        const amount = Number((split as { amount?: unknown })?.amount);

        if (!isPaymentMethod(method) || !Number.isFinite(amount)) {
          return null;
        }

        return { method, amount };
      })
      .filter((split): split is PaymentSplit => split !== null);
  };

  const mapTransaction = (transaction: SupabaseTransactionRow): Transaction => {
    const fallback = {
      description: transaction.description,
      quantity: Number(transaction.quantity) || 0,
      unitPrice: Number(transaction.unit_price) || 0,
      total: Number(transaction.total) || 0,
    };

    const metadata = decodeMetadata(transaction.notes);

    const items = metadata?.items ?? normalizeItems(fallback);
    const paymentSplits = normalizePaymentSplits(transaction.payment_splits);
    const notes = metadata ? metadata.note : transaction.notes ?? undefined;

    const normalizedType: Transaction['type'] =
      transaction.type === 'entrada' ? 'venda' : (transaction.type ?? 'venda');

    return {
      id: transaction.id,
      sessionId: transaction.session_id || '',
      type: normalizedType,
      description: transaction.description,
      quantity: fallback.quantity,
      unitPrice: fallback.unitPrice,
      total: fallback.total,
      paymentMethod: transaction.payment_method,
      paymentSplits,
      items,
      notes,
      createdAt: transaction.created_at,
      deletedAt: transaction.deleted_at ?? null,
    };
  };

  // Load all transactions
  const loadTransactions = async () => {
    try {
      const baseQuery = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await baseQuery.is('deleted_at', null);

      if (error) {
        if (!isMissingDeletedAtColumnError(error)) {
          throw error;
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (fallbackError) {
          throw fallbackError;
        }

        setTransactions((fallbackData ?? []).map(mapTransaction));
        return;
      }

      setTransactions((data ?? []).map(mapTransaction));
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar transações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save or update transaction
  const saveTransaction = async (transaction: TransactionInput): Promise<Transaction | null> => {
    try {
      const {
        id,
        createdAt,
        sessionId,
        type,
        description,
        quantity,
        unitPrice,
        total,
        paymentMethod,
        paymentSplits,
        notes,
        items,
        deletedAt,
        creditSaleId,
      } = transaction;

      if (!sessionId) {
        throw new Error('Transação sem sessão associada.');
      }

      const clonedPaymentSplits =
        paymentSplits && paymentSplits.length > 0 ? safeClone(paymentSplits) : null;

      const sanitizedItems = sanitizeItems(items);
      const clonedItems = sanitizedItems ? safeClone(sanitizedItems) : null;

      const normalizedType: TransactionInput['type'] =
        type === 'entrada' ? 'venda' : (type ?? 'venda');

      const transactionData: Record<string, unknown> = {
        session_id: sessionId,
        type: normalizedType,
        description,
        quantity,
        unit_price: unitPrice,
        total,
        payment_method: paymentMethod,
        payment_splits: clonedPaymentSplits,
        items: clonedItems,
        notes: notes?.trim() || null,
      };

      if (id) {
        transactionData.id = id;
      }

      const normalizedCreatedAt = normalizeTimestamp(createdAt);
      if (normalizedCreatedAt) {
        transactionData.created_at = normalizedCreatedAt;
      }

      if (deletedAt !== undefined) {
        transactionData.deleted_at = deletedAt;
      } else if (!id) {
        transactionData.deleted_at = null;
      }

      const persistTransaction = async (payload: Record<string, unknown>) => {
        const updatePayload = payload as Database['public']['Tables']['transactions']['Update'];
        const insertPayload = payload as Database['public']['Tables']['transactions']['Insert'];

        const { data, error } = id
          ? await supabase
              .from('transactions')
              .update(updatePayload)
              .eq('id', id)
              .select()
              .single()
          : await supabase
              .from('transactions')
              .insert([insertPayload])
              .select()
              .single();

        if (error) {
          throw error;
        }

        return data;
      };

      let payload: Record<string, unknown> = { ...transactionData };
      let metadataFallbackApplied = false;

      // Attempt to persist transaction, applying fallbacks if specific columns are missing
      while (true) {
        try {
          const data = await persistTransaction(payload);

          await loadTransactions();

          return data ? mapTransaction(data) : null;
        } catch (error) {
          if ('deleted_at' in payload && isMissingDeletedAtColumnError(error)) {
            const { deleted_at: _removed, ...rest } = payload;
            payload = rest;
            continue;
          }

          if (!metadataFallbackApplied && isMissingItemsColumnError(error)) {
            console.warn('Items column not available. Falling back to metadata storage.');

            const metadataNotes = encodeMetadata(notes, clonedItems ?? undefined);
            const fallbackData: Record<string, unknown> = {
              ...payload,
              notes: metadataNotes ?? (payload as { [key: string]: unknown }).notes,
            };

            delete fallbackData.items;

            payload = fallbackData;
            metadataFallbackApplied = true;
            continue;
          }

          throw error;
        }
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar transação',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    try {
      const deletedAt = new Date().toISOString();

      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: deletedAt })
        .eq('id', id);

      if (error) {
        if (!isMissingDeletedAtColumnError(error)) {
          throw error;
        }

        const { error: fallbackError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (fallbackError) {
          throw fallbackError;
        }
      }

      await loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir transação',
        variant: 'destructive',
      });
    }
  };

  // Get all transactions
  const getTransactions = () => transactions;

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    loadTransactions();
  }, [autoLoad]);

  return {
    transactions,
    loading,
    saveTransaction,
    deleteTransaction,
    getTransactions,
    reload: loadTransactions,
  };
};
