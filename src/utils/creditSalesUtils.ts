import { parseISO, isValid } from 'date-fns';
import { CreditSale, Transaction } from '@/types';

export type CreditSaleStatusMap = Map<string, CreditSale['status']>;

export const buildCreditSaleStatusMap = (creditSales: CreditSale[]): CreditSaleStatusMap => {
  return creditSales.reduce<CreditSaleStatusMap>((map, sale) => {
    if (sale.id) {
      map.set(sale.id, sale.status);
    }
    return map;
  }, new Map());
};

export const isTransactionSettled = (
  transaction: Transaction,
  creditSaleStatuses: CreditSaleStatusMap,
): boolean => {
  if (!transaction.creditSaleId) {
    return true;
  }

  const status = creditSaleStatuses.get(transaction.creditSaleId);
  if (!status) {
    return false;
  }

  return status === 'paga';
};

export const filterSettledTransactions = (
  transactions: Transaction[],
  creditSales: CreditSale[],
): Transaction[] => {
  if (!creditSales.length) {
    return transactions;
  }

  const statusMap = buildCreditSaleStatusMap(creditSales);
  return transactions.filter((transaction) => isTransactionSettled(transaction, statusMap));
};

export const parseDateOrNull = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

export const safeJsonCast = <T>(value: unknown): T | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as T;
};
