// Sistema Lojista - Analytics Service with Hooks
// New analytics service that uses hooks instead of localStorage

import { startOfDay, endOfDay, addDays, subDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, ServiceOrder, CreditSale } from '@/types';
import { filterSettledTransactions } from '@/utils/creditSalesUtils';

export interface ReportFilters {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  includeOSWithoutTransaction: boolean;
  transactionTypes: ('venda' | 'entrada' | 'saida' | 'despesa')[];
  paymentMethods: string[];
  orderStatuses?: ('aberta' | 'em_andamento' | 'concluida' | 'entregue' | 'cancelada')[];
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  entries: number;
  exits: number;
  expenses: number;
}

export interface TopDescription {
  description: string;
  count: number;
  total: number;
}

export interface OrdersFunnel {
  open: number;
  completed: number;
  cancelled: number;
}

export interface PeriodData {
  revenue: number;
  entries: number;
  exits: number;
  expenses: number;
  result: number;
  salesCount: number;
  averageTicket: number;
  conversionRate: number;
  totalOrders: number;
  completedOrders: number;
  dailyRevenue: DailyRevenue[];
  paymentMethods: Record<string, number>;
  topDescriptions: TopDescription[];
  ordersFunnel: OrdersFunnel;
}

export interface AnalyticsReport {
  current: PeriodData;
  previous: PeriodData;
  deltas: {
    revenue: number;
    entries: number;
    exits: number;
    expenses: number;
    result: number;
    salesCount: number;
    averageTicket: number;
    conversionRate: number;
  };
}

export interface PredefinedPeriod {
  label: string;
  startDate: string;
  endDate: string;
}

export class AnalyticsServiceWithHooks {
  // Generate analytics report using provided data
  generateReport(
    filters: ReportFilters,
    allTransactions: Transaction[],
    allOrders: ServiceOrder[],
    creditSales: CreditSale[] = [],
  ): AnalyticsReport {
    const normalizedFilters: ReportFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      includeOSWithoutTransaction: filters.includeOSWithoutTransaction ?? true,
      transactionTypes: filters.transactionTypes ?? [],
      paymentMethods: filters.paymentMethods ?? [],
      orderStatuses: filters.orderStatuses,
    };

    const currentData = this.generatePeriodData(
      normalizedFilters,
      allTransactions,
      allOrders,
      creditSales,
    );

    // Calculate previous period
    const periodLength = this.calculatePeriodLength(normalizedFilters.startDate, normalizedFilters.endDate);
    const previousFilters: ReportFilters = {
      ...normalizedFilters,
      startDate: format(subDays(parseISO(normalizedFilters.startDate), periodLength), 'yyyy-MM-dd'),
      endDate: format(subDays(parseISO(normalizedFilters.endDate), periodLength), 'yyyy-MM-dd')
    };

    const previousData = this.generatePeriodData(
      previousFilters,
      allTransactions,
      allOrders,
      creditSales,
    );
    
    // Calculate deltas
    const deltas = {
      revenue: this.calculateDelta(currentData.revenue, previousData.revenue),
      entries: this.calculateDelta(currentData.entries, previousData.entries),
      exits: this.calculateDelta(currentData.exits, previousData.exits),
      expenses: this.calculateDelta(currentData.expenses, previousData.expenses),
      result: this.calculateDelta(currentData.result, previousData.result),
      salesCount: this.calculateDelta(currentData.salesCount, previousData.salesCount),
      averageTicket: this.calculateDelta(currentData.averageTicket, previousData.averageTicket),
      conversionRate: this.calculateDelta(currentData.conversionRate, previousData.conversionRate)
    };

    return {
      current: currentData,
      previous: previousData,
      deltas
    };
  }

  private generatePeriodData(
    filters: ReportFilters,
    allTransactions: Transaction[],
    allOrders: ServiceOrder[],
    creditSales: CreditSale[] = [],
  ): PeriodData {
    // Filter transactions by date range
    const startDate = startOfDay(parseISO(filters.startDate));
    const endDate = endOfDay(parseISO(filters.endDate));
    
    const settledTransactions = filterSettledTransactions(allTransactions, creditSales);

    const filteredTransactions = settledTransactions.filter(t => {
      const transactionDate = parseISO(t.createdAt);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Filter orders by date range  
    const filteredOrders = allOrders.filter(o => {
      const orderDate = parseISO(o.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Apply additional filters
    let transactions = filteredTransactions;
    if (filters.transactionTypes.length > 0) {
      transactions = transactions.filter(t => filters.transactionTypes.includes(t.type));
    }
    if (filters.paymentMethods.length > 0) {
      transactions = transactions.filter(t => filters.paymentMethods.includes(t.paymentMethod));
    }

    let orders = filteredOrders;
    if (filters.orderStatuses && filters.orderStatuses.length > 0) {
      orders = orders.filter(o => filters.orderStatuses!.includes(o.status));
    }

    if (!filters.includeOSWithoutTransaction) {
      const transactionOrderIdSet = new Set(
        transactions
          .map(transaction =>
            (transaction as any).serviceOrderId ??
            (transaction as any).orderId ??
            (transaction as any).service_order_id ??
            null
          )
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      );

      const hasLinkedIds = transactionOrderIdSet.size > 0;

      orders = orders.filter(order => {
        const orderAny = order as any;

        if (typeof orderAny.transactionCount === 'number') {
          return orderAny.transactionCount > 0;
        }

        if (typeof orderAny.hasTransactions === 'boolean') {
          return orderAny.hasTransactions;
        }

        if (Array.isArray(orderAny.transactions)) {
          return orderAny.transactions.length > 0;
        }

        const possibleIds = [order.id, orderAny.orderId, orderAny.serviceOrderId].filter(
          (id): id is string => typeof id === 'string' && id.length > 0
        );

        if (possibleIds.some(id => transactionOrderIdSet.has(id))) {
          return true;
        }

        if (!hasLinkedIds) {
          return true;
        }

        return false;
      });
    }

    // Calculate metrics
    const revenue = transactions.filter(t => t.type === 'venda').reduce((sum, t) => sum + t.total, 0);
    const entries = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.total, 0);
    const exits = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.total, 0);
    const expenses = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.total, 0);
    const result = revenue + entries - exits - expenses;
    const salesCount = transactions.filter(t => t.type === 'venda').length;
    const averageTicket = salesCount > 0 ? revenue / salesCount : 0;

    // Calculate conversion rate
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'concluida').length;
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Generate daily revenue data
    const dailyRevenue = this.generateDailyRevenue(filters.startDate, filters.endDate, transactions);

    // Calculate payment methods distribution
    const paymentMethods = this.calculatePaymentMethods(transactions.filter(t => t.type === 'venda'));

    // Get top descriptions
    const topDescriptions = this.getTopDescriptions(transactions.filter(t => t.type === 'venda'), 10);

    // Calculate orders funnel
    const ordersFunnel = {
      open: orders.filter(o => o.status === 'aberta').length,
      completed: completedOrders,
      cancelled: orders.filter(o => o.status === 'cancelada').length
    };

    return {
      revenue,
      entries,
      exits,
      expenses,
      result,
      salesCount,
      averageTicket,
      conversionRate,
      totalOrders,
      completedOrders,
      dailyRevenue,
      paymentMethods,
      topDescriptions,
      ordersFunnel
    };
  }

  private generateDailyRevenue(startDate: string, endDate: string, transactions: Transaction[]): DailyRevenue[] {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const dailyData: DailyRevenue[] = [];

    let currentDate = start;
    while (currentDate <= end) {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);
      
      const dayTransactions = transactions.filter(t => {
        const transactionDate = parseISO(t.createdAt);
        return transactionDate >= dayStart && transactionDate <= dayEnd;
      });

      const revenue = dayTransactions.filter(t => t.type === 'venda').reduce((sum, t) => sum + t.total, 0);
      const entries = dayTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.total, 0);
      const exits = dayTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.total, 0);
      const expenses = dayTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.total, 0);

      dailyData.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        revenue,
        entries,
        exits,
        expenses
      });

      currentDate = addDays(currentDate, 1);
    }

    return dailyData;
  }

  private calculatePaymentMethods(salesTransactions: Transaction[]): Record<string, number> {
    const paymentMethods: Record<string, number> = {};
    
    salesTransactions.forEach(transaction => {
      if (transaction.paymentSplits && transaction.paymentSplits.length > 0) {
        // Handle split payments
        transaction.paymentSplits.forEach(split => {
          paymentMethods[split.method] = (paymentMethods[split.method] || 0) + split.amount;
        });
      } else {
        // Handle single payment
        const method = transaction.paymentMethod || 'outros';
        paymentMethods[method] = (paymentMethods[method] || 0) + transaction.total;
      }
    });

    return paymentMethods;
  }

  private getTopDescriptions(salesTransactions: Transaction[], limit: number): TopDescription[] {
    const descriptionMap = new Map<string, { count: number; total: number }>();

    salesTransactions.forEach(transaction => {
      const existing = descriptionMap.get(transaction.description) || { count: 0, total: 0 };
      descriptionMap.set(transaction.description, {
        count: existing.count + transaction.quantity,
        total: existing.total + transaction.total
      });
    });

    return Array.from(descriptionMap.entries())
      .map(([description, data]) => ({
        description,
        count: data.count,
        total: data.total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  private calculatePeriodLength(startDate: string, endDate: string): number {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  private calculateDelta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Get predefined period options
  getPredefinedPeriods(): {
    today: PredefinedPeriod;
    yesterday: PredefinedPeriod;
    last7Days: PredefinedPeriod;
    currentMonth: PredefinedPeriod;
  } {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const startOfWeek = subDays(today, 6);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      today: {
        label: 'Hoje',
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd')
      },
      yesterday: {
        label: 'Ontem',
        startDate: format(yesterday, 'yyyy-MM-dd'),
        endDate: format(yesterday, 'yyyy-MM-dd')
      },
      last7Days: {
        label: 'Últimos 7 dias',
        startDate: format(startOfWeek, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd')
      },
      currentMonth: {
        label: 'Este mês',
        startDate: format(startOfMonth, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd')
      }
    };
  }

  // Get default filters (today)
  getDefaultFilters(): ReportFilters {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      startDate: today,
      endDate: today,
      includeOSWithoutTransaction: true,
      transactionTypes: [],
      paymentMethods: []
    };
  }
}

export const analyticsServiceWithHooks = new AnalyticsServiceWithHooks();