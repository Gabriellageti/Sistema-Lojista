import { useState, useEffect, useCallback } from 'react';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  CreditSale,
  CreditSaleInput,
  CreditSalePostponeInput,
  CreditSalePayment,
  PaymentMethod,
  CreditSaleReminderPreferences,
  CreditSaleItem,
} from '@/types';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

type CreditSaleRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  description: string;
  items: Json | null;
  total: number;
  installments: number;
  installment_value: number | null;
  amount_paid: number;
  remaining_amount: number | null;
  sale_date: string;
  charge_date: string;
  status: 'em_aberto' | 'paga';
  reminder_preferences: Json | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CreditSalePaymentRow = {
  id: string;
  credit_sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  session_id: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CreditSaleInsert = {
  customer_name: string;
  customer_phone?: string | null;
  description: string;
  items?: Json | null;
  total: number;
  installments?: number;
  installment_value?: number | null;
  amount_paid?: number;
  remaining_amount?: number | null;
  sale_date: string;
  charge_date: string;
  status?: 'em_aberto' | 'paga';
  reminder_preferences?: Json | null;
  notes?: string | null;
  archived_at?: string | null;
  created_at?: string;
  deleted_at?: string | null;
};

type CreditSaleUpdate = Partial<CreditSaleInsert> & {
  updated_at?: string;
};

type CreditSalePaymentInsert = {
  credit_sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  session_id?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  created_at?: string;
};

const normalizeTimestamp = (value: string | undefined | null): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const trimmed = value.trim();
  const normalizedInput = trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`;
  const date = new Date(normalizedInput);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const normalizeNullableTimestamp = (value: string | undefined | null): string | null => {
  if (!value) return null;
  return normalizeTimestamp(value);
};

const safeClone = <T,>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const parseItems = (value: unknown): CreditSaleItem[] => {
  if (!value || typeof value !== 'object') return [];

  const cloned = safeClone(value) as Array<Partial<CreditSaleItem>>;
  if (!Array.isArray(cloned)) return [];

  return cloned
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const total = Number.isFinite(item.total)
        ? Number(item.total)
        : roundCurrency(quantity * unitPrice);

      return {
        description: item.description?.toString() || 'Item',
        quantity,
        unitPrice,
        total,
      };
    })
    .filter((item) => item.quantity > 0);
};

const calculateItemsTotal = (items?: CreditSaleItem[] | null): number | null => {
  if (!items || items.length === 0) return null;

  return roundCurrency(
    items.reduce((acc, item) => acc + (Number.isFinite(item.total) ? item.total : item.quantity * item.unitPrice), 0),
  );
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const calculateInstallmentValue = (total: number, installments: number): number | null => {
  if (!Number.isFinite(total) || !Number.isFinite(installments) || installments <= 1) {
    return null;
  }

  return roundCurrency(total / installments);
};

const calculateRemainingAmount = (total: number, amountPaid: number): number => {
  const remaining = total - amountPaid;
  return remaining <= 0 ? 0 : roundCurrency(remaining);
};

const parseReminderPreferences = (value: unknown): CreditSaleReminderPreferences | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const obj = safeClone(value) as any;
  return {
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : true,
    daysBefore: Number.isFinite(obj?.daysBefore) ? Number(obj.daysBefore) : 0,
    remindAt: typeof obj?.remindAt === 'string' ? obj.remindAt : null,
  };
};

const mapSale = (row: CreditSaleRow): CreditSale => {
  const items = parseItems(row.items);
  const itemsTotal = calculateItemsTotal(items);
  const amountPaid = Number(row.amount_paid);
  const total = Number.isFinite(row.total) ? Number(row.total) : itemsTotal ?? 0;
  const remainingAmount =
    row.remaining_amount !== null && row.remaining_amount !== undefined
      ? Number(row.remaining_amount)
      : calculateRemainingAmount(total, amountPaid);

  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? null,
    description: row.description,
    items,
    total: roundCurrency(itemsTotal ?? total),
    installments: row.installments,
    installmentValue: row.installment_value ? Number(row.installment_value) : null,
    amountPaid: roundCurrency(amountPaid),
    remainingAmount: roundCurrency(remainingAmount),
    saleDate: normalizeTimestamp(row.sale_date),
    chargeDate: normalizeTimestamp(row.charge_date),
    status: row.status,
    reminderPreferences: parseReminderPreferences(row.reminder_preferences),
    notes: row.notes ?? null,
    archivedAt: normalizeNullableTimestamp(row.archived_at),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
    deletedAt: normalizeNullableTimestamp(row.deleted_at),
  };
};

const mapPayment = (row: CreditSalePaymentRow): CreditSalePayment => ({
  id: row.id,
  creditSaleId: row.credit_sale_id,
  amount: Number(row.amount),
  paymentDate: normalizeTimestamp(row.payment_date),
  paymentMethod: row.payment_method as any,
  sessionId: row.session_id ?? null,
  transactionId: row.transaction_id ?? null,
  notes: row.notes ?? null,
  createdAt: normalizeTimestamp(row.created_at),
  updatedAt: normalizeTimestamp(row.updated_at),
});

const buildInsertPayload = (sale: CreditSaleInput): CreditSaleInsert => {
  const itemsTotal = calculateItemsTotal(sale.items);
  const effectiveTotal = roundCurrency(itemsTotal ?? sale.total);
  const safeInstallments = Math.max(sale.installments || 1, 1);
  const installmentValue = calculateInstallmentValue(effectiveTotal, safeInstallments);
  const amountPaid = roundCurrency(sale.amountPaid ?? 0);
  const remainingAmount = sale.remainingAmount ?? calculateRemainingAmount(effectiveTotal, amountPaid);
  return {
    customer_name: sale.customerName,
    customer_phone: sale.customerPhone ?? null,
    description: sale.description,
    items: sale.items && sale.items.length > 0 ? (safeClone(sale.items) as unknown as Json) : null,
    total: effectiveTotal,
    installments: safeInstallments,
    installment_value: installmentValue,
    amount_paid: roundCurrency(amountPaid),
    remaining_amount: roundCurrency(remainingAmount),
    sale_date: normalizeTimestamp(sale.saleDate),
    charge_date: normalizeTimestamp(sale.chargeDate),
    status: sale.status ?? 'em_aberto',
    reminder_preferences: sale.reminderPreferences ? (safeClone(sale.reminderPreferences) as unknown as Json) : null,
    notes: sale.notes ?? null,
    archived_at: normalizeNullableTimestamp(sale.archivedAt),
    created_at: sale.createdAt ? normalizeTimestamp(sale.createdAt) : new Date().toISOString(),
    deleted_at: normalizeNullableTimestamp(sale.deletedAt),
  };
};

const buildUpdatePayload = (sale: CreditSaleInput): CreditSaleUpdate => {
  const itemsTotal = calculateItemsTotal(sale.items);
  const effectiveTotal = roundCurrency(itemsTotal ?? sale.total);
  const safeInstallments = Math.max(sale.installments || 1, 1);
  const installmentValue = calculateInstallmentValue(effectiveTotal, safeInstallments);
  const amountPaid = roundCurrency(sale.amountPaid ?? 0);
  const remainingAmount = sale.remainingAmount ?? calculateRemainingAmount(effectiveTotal, amountPaid);
  return {
    customer_name: sale.customerName,
    customer_phone: sale.customerPhone ?? null,
    description: sale.description,
    items: sale.items && sale.items.length > 0 ? (safeClone(sale.items) as unknown as Json) : null,
    total: effectiveTotal,
    installments: safeInstallments,
    installment_value: installmentValue,
    amount_paid: roundCurrency(amountPaid),
    remaining_amount: roundCurrency(remainingAmount),
    sale_date: normalizeTimestamp(sale.saleDate),
    charge_date: normalizeTimestamp(sale.chargeDate),
    status: sale.status ?? 'em_aberto',
    reminder_preferences: sale.reminderPreferences ? (safeClone(sale.reminderPreferences) as unknown as Json) : null,
    notes: sale.notes ?? null,
    archived_at: normalizeNullableTimestamp(sale.archivedAt),
    deleted_at: normalizeNullableTimestamp(sale.deletedAt),
    updated_at: sale.updatedAt ? normalizeTimestamp(sale.updatedAt) : new Date().toISOString(),
  };
};

const isMissingCreditSalesTableError = (error: unknown): boolean => {
  const err = error as any;
  const code = err?.code;
  const message = err?.message?.toLowerCase() || '';
  
  if (code === '42P01') {
    return true;
  }
  
  return message.includes('credit_sales') && (message.includes('relation') || message.includes('does not exist'));
};

export const useCreditSales = () => {
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [payments, setPayments] = useState<CreditSalePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureAvailable, setFeatureAvailable] = useState(true);

  const loadCreditSales = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_sales')
        .select('*')
        .order('charge_date', { ascending: true });

      if (error) {
        if (isMissingCreditSalesTableError(error)) {
          console.warn('Credit sales table does not exist yet. Feature is not available.');
          setFeatureAvailable(false);
          setCreditSales([]);
          setPayments([]);
          return;
        }
        throw error;
      }

      const mapped = data.map(mapSale);
      setCreditSales(mapped);

      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('credit_sale_payments' as any)
        .select('*')
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.warn('Error loading credit sale payments:', paymentsError);
        setPayments([]);
      } else {
        setPayments(((paymentsData as any[]) || []).map(mapPayment));
      }
    } catch (error) {
      console.error('Error loading credit sales:', error);
      toast.error('Erro ao carregar vendas a prazo.');
      setCreditSales([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCreditSales();
  }, [loadCreditSales]);

  const ensureFeatureAvailability = useCallback(() => {
    if (featureAvailable) {
      return true;
    }

    toast.error('Funcionalidade indisponível. Execute as migrações do banco de dados.');
    return false;
  }, [featureAvailable]);

  const createCreditSale = useCallback(
    async (sale: CreditSaleInput): Promise<CreditSale | null> => {
      if (!ensureFeatureAvailability()) return null;

      try {
        const payload = buildInsertPayload(sale);
        const { data, error } = await supabase
          .from('credit_sales')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        const mapped = mapSale(data);
        setCreditSales((current) => [...current, mapped].sort((a, b) => a.chargeDate.localeCompare(b.chargeDate)));
        toast.success('Venda a prazo criada!');
        return mapped;
      } catch (error) {
        console.error('Error creating credit sale:', error);
        toast.error('Erro ao criar venda a prazo.');
        return null;
      }
    },
    [ensureFeatureAvailability],
  );

  const updateCreditSale = useCallback(
    async (sale: CreditSaleInput): Promise<CreditSale | null> => {
      if (!sale.id) {
        throw new Error('Missing credit sale identifier');
      }

      if (!ensureFeatureAvailability()) return null;

      try {
        const payload = buildUpdatePayload(sale);
        const { data, error } = await supabase
          .from('credit_sales')
          .update(payload)
          .eq('id', sale.id)
          .select()
          .single();

        if (error) throw error;

        const mapped = mapSale(data);
        setCreditSales((current) =>
          current
            .map((existing) => (existing.id === sale.id ? mapped : existing))
            .sort((a, b) => a.chargeDate.localeCompare(b.chargeDate)),
        );
        toast.success('Venda a prazo atualizada!');
        return mapped;
      } catch (error) {
        console.error('Error updating credit sale:', error);
        toast.error('Erro ao atualizar venda a prazo.');
        return null;
      }
    },
    [ensureFeatureAvailability],
  );

  const registerPayment = useCallback(
    async (
      creditSaleId: string,
      paymentData: {
        amount: number;
        paymentMethod: PaymentMethod;
        paymentDate: string;
        sessionId?: string | null;
        notes?: string | null;
      },
    ): Promise<CreditSalePayment | null> => {
      if (!ensureFeatureAvailability()) return null;

      const sale = creditSales.find((s) => s.id === creditSaleId);
      if (!sale) {
        toast.error('Venda a prazo não encontrada.');
        return null;
      }

      const remainingAmount = sale.remainingAmount ?? sale.total;
      if (paymentData.amount > remainingAmount) {
        toast.error('O valor do pagamento não pode ser maior que o valor restante.');
        return null;
      }

      try {
        // Register transaction for this payment
        let transactionId: string | null = null;
        try {
          const { data: txData, error: txError } = await supabase
            .from('transactions')
            .insert([
              {
                session_id: paymentData.sessionId ?? null,
                type: 'venda',
                description: `Pagamento crediário: ${sale.description}`,
                quantity: 1,
                unit_price: paymentData.amount,
                total: paymentData.amount,
                payment_method: paymentData.paymentMethod,
                created_at: normalizeTimestamp(paymentData.paymentDate),
                notes: paymentData.notes ?? null,
              },
            ])
            .select()
            .single();

          if (txError) {
            console.warn('Error creating transaction:', txError);
          } else {
            transactionId = txData.id;
          }
        } catch (txError) {
          console.warn('Failed to create transaction:', txError);
        }

        // Insert payment record
        const paymentInsert: CreditSalePaymentInsert = {
          credit_sale_id: creditSaleId,
          amount: paymentData.amount,
          payment_date: normalizeTimestamp(paymentData.paymentDate),
          payment_method: paymentData.paymentMethod,
          session_id: paymentData.sessionId ?? null,
          transaction_id: transactionId,
          notes: paymentData.notes ?? null,
        };

        const { data: paymentRecord, error: paymentError } = await supabase
          .from('credit_sale_payments' as any)
          .insert([paymentInsert as any])
          .select()
          .single();

        if (paymentError) {
          throw paymentError;
        }

        // Update credit sale
        const newAmountPaid = roundCurrency(sale.amountPaid + paymentData.amount);
        const newRemainingAmount = calculateRemainingAmount(sale.total, newAmountPaid);
        const newStatus = newRemainingAmount <= 0 ? 'paga' : 'em_aberto';

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
                ? Math.floor(sale.amountPaid / baseInstallmentValue)
                : 0;

            const totalDaysSinceSale = Math.max(differenceInCalendarDays(currentChargeDate, saleDate), 0);

            if (installmentsPaid > 0) {
              const interval = Math.round(totalDaysSinceSale / installmentsPaid);
              return interval > 0 ? interval : null;
            }

            return totalDaysSinceSale > 0 ? totalDaysSinceSale : null;
          } catch (error) {
            console.warn('Failed to calculate installment interval', error);
            return null;
          }
        };

        const intervalBetweenInstallments = calculateInstallmentInterval();
        const effectiveInterval = intervalBetweenInstallments ?? 30;

        let nextChargeDate: string | null = null;
        if (newRemainingAmount > 0) {
          const currentChargeDate = parseISO(sale.chargeDate);

          if (!Number.isNaN(currentChargeDate.getTime())) {
            nextChargeDate = addDays(currentChargeDate, effectiveInterval).toISOString();
          }
        }

        const updatePayload: CreditSaleUpdate = {
          amount_paid: newAmountPaid,
          remaining_amount: newRemainingAmount,
          status: newStatus,
        };

        if (newRemainingAmount > 0 && nextChargeDate) {
          updatePayload.charge_date = normalizeTimestamp(nextChargeDate);
        }

        const { data: updatedSale, error: updateError } = await supabase
          .from('credit_sales')
          .update(updatePayload)
          .eq('id', creditSaleId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        const mapped = mapSale(updatedSale);
        setCreditSales((current) =>
          current.map((s) => (s.id === creditSaleId ? mapped : s)).sort((a, b) => a.chargeDate.localeCompare(b.chargeDate)),
        );

        const mappedPayment = mapPayment(paymentRecord as any);
        setPayments((current) => [mappedPayment, ...current]);

        toast.success('Pagamento registrado com sucesso!');
        return mappedPayment;
      } catch (error) {
        console.error('Error registering payment:', error);
        toast.error('Erro ao registrar pagamento.');
        return null;
      }
    },
    [creditSales, ensureFeatureAvailability],
  );

  const postponeCreditSale = useCallback(
    async (id: string, update: CreditSalePostponeInput): Promise<CreditSale | null> => {
      if (!ensureFeatureAvailability()) return null;

      try {
        const payload: CreditSaleUpdate = {
          charge_date: normalizeTimestamp(update.chargeDate),
          reminder_preferences: update.reminderPreferences ? (safeClone(update.reminderPreferences) as unknown as Json) : null,
          notes: update.notes ?? null,
          status: 'em_aberto',
          archived_at: null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('credit_sales')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        const mapped = mapSale(data);
        setCreditSales((current) =>
          current.map((sale) => (sale.id === id ? mapped : sale)).sort((a, b) => a.chargeDate.localeCompare(b.chargeDate)),
        );
        toast.success('Cobrança reagendada!');
        return mapped;
      } catch (error) {
        console.error('Error postponing credit sale:', error);
        toast.error('Erro ao reagendar cobrança.');
        return null;
      }
    },
    [ensureFeatureAvailability],
  );

  const archiveCreditSale = useCallback(
    async (id: string): Promise<boolean> => {
      if (!ensureFeatureAvailability()) return false;

      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('credit_sales')
          .update({ archived_at: now, updated_at: now })
          .eq('id', id);

        if (error) throw error;

        setCreditSales((current) =>
          current.map((sale) => (sale.id === id ? { ...sale, archivedAt: now, updatedAt: now } : sale)),
        );
        toast.success('Venda arquivada!');
        return true;
      } catch (error) {
        console.error('Error archiving credit sale:', error);
        toast.error('Erro ao arquivar venda.');
        return false;
      }
    },
    [ensureFeatureAvailability],
  );

  const removeCreditSale = useCallback(
    async (id: string): Promise<boolean> => {
      if (!ensureFeatureAvailability()) return false;

      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('credit_sales')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id);

        if (error) throw error;

        setCreditSales((current) => current.filter((sale) => sale.id !== id));
        toast.success('Venda removida!');
        return true;
      } catch (error) {
        console.error('Error removing credit sale:', error);
        toast.error('Erro ao remover venda.');
        return false;
      }
    },
    [ensureFeatureAvailability],
  );

  const getPaymentsBySale = useCallback(
    (creditSaleId: string): CreditSalePayment[] => {
      return payments.filter((p) => p.creditSaleId === creditSaleId);
    },
    [payments],
  );

  return {
    creditSales,
    payments,
    loading,
    featureAvailable,
    createCreditSale,
    updateCreditSale,
    registerPayment,
    getPaymentsBySale,
    postponeCreditSale,
    archiveCreditSale,
    removeCreditSale,
  };
};
