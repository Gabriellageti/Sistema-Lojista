// Help Smart - Analytics Service

import { Transaction, ServiceOrder } from '@/types';
import { storageService } from './StorageService';
import { useTransactions } from '@/hooks/useTransactions';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { startOfDay, endOfDay, subDays, format, differenceInHours } from 'date-fns';

export interface AnalyticsData {
  revenue: number;
  entries: number;
  exits: number;
  expenses: number;
  result: number;
  salesCount: number;
  averageTicket: number;
  completedOrders: number;
  totalOrders: number;
  conversionRate: number;
  paymentMethods: Record<string, number>;
  topDescriptions: Array<{ description: string; count: number; total: number }>;
  dailyRevenue: Array<{ date: string; current: number; previous: number }>;
  ordersFunnel: { open: number; completed: number; cancelled: number };
}

export interface PeriodComparison {
  current: AnalyticsData;
  previous: AnalyticsData;
  deltas: {
    revenue: number;
    entries: number;
    exits: number;
    result: number;
    averageTicket: number;
    conversionRate: number;
  };
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  includeOSWithoutTransaction: boolean;
  transactionTypes: string[];
  paymentMethods: string[];
}

class AnalyticsService {
  private calculateDelta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private normalizeDescription(description: string): string {
    return description.toLowerCase().trim();
  }

  private filterTransactions(transactions: Transaction[], filters: ReportFilters): Transaction[] {
    const start = startOfDay(new Date(filters.startDate));
    const end = endOfDay(new Date(filters.endDate));

    return transactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      const inPeriod = transactionDate >= start && transactionDate <= end;
      const typeMatch = filters.transactionTypes.length === 0 || filters.transactionTypes.includes(t.type);
      const paymentMatch = filters.paymentMethods.length === 0 || filters.paymentMethods.includes(t.paymentMethod);
      
      return inPeriod && typeMatch && paymentMatch;
    });
  }

  private filterOrders(orders: ServiceOrder[], filters: ReportFilters): ServiceOrder[] {
    const start = startOfDay(new Date(filters.startDate));
    const end = endOfDay(new Date(filters.endDate));

    return orders.filter(o => {
      const orderDate = new Date(o.updatedAt);
      return orderDate >= start && orderDate <= end;
    });
  }

  private calculateAnalytics(transactions: Transaction[], orders: ServiceOrder[]): AnalyticsData {
    // Calculate financial metrics
    const revenue = transactions
      .filter(t => t.type === 'venda')
      .reduce((sum, t) => sum + t.total, 0);

    const entries = transactions
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.total, 0);

    const exits = transactions
      .filter(t => t.type === 'saida')
      .reduce((sum, t) => sum + t.total, 0);

    const expenses = transactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + t.total, 0);

    const result = revenue + entries - exits - expenses;

    const salesTransactions = transactions.filter(t => t.type === 'venda');
    const salesCount = salesTransactions.length;
    const averageTicket = salesCount > 0 ? revenue / salesCount : 0;

    // Calculate OS metrics
    const completedOrders = orders.filter(o => o.status === 'concluida').length;
    const totalOrders = orders.length;
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Payment methods breakdown
    const paymentMethods = transactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
      return acc;
    }, {} as Record<string, number>);

    // Top descriptions
    const descriptionMap = transactions.reduce((acc, t) => {
      const key = this.normalizeDescription(t.description);
      if (!acc[key]) {
        acc[key] = { description: t.description, count: 0, total: 0 };
      }
      acc[key].count++;
      acc[key].total += t.total;
      return acc;
    }, {} as Record<string, { description: string; count: number; total: number }>);

    const topDescriptions = Object.values(descriptionMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Daily revenue (placeholder - will be calculated properly in comparison)
    const dailyRevenue: Array<{ date: string; current: number; previous: number }> = [];

    // Orders funnel
    const ordersFunnel = {
      open: orders.filter(o => o.status === 'aberta').length,
      completed: completedOrders,
      cancelled: orders.filter(o => o.status === 'cancelada').length,
    };

    return {
      revenue,
      entries,
      exits,
      expenses,
      result,
      salesCount,
      averageTicket,
      completedOrders,
      totalOrders,
      conversionRate,
      paymentMethods,
      topDescriptions,
      dailyRevenue,
      ordersFunnel,
    };
  }

  private calculateDailyRevenue(
    transactions: Transaction[], 
    startDate: string, 
    endDate: string,
    previousTransactions?: Transaction[]
  ): Array<{ date: string; current: number; previous: number }> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dailyRevenue: Array<{ date: string; current: number; previous: number }> = [];

    const currentDaily = new Map<string, number>();
    const previousDaily = new Map<string, number>();

    // Calculate current period daily revenue
    transactions.filter(t => t.type === 'venda').forEach(t => {
      const date = format(new Date(t.createdAt), 'yyyy-MM-dd');
      currentDaily.set(date, (currentDaily.get(date) || 0) + t.total);
    });

    // Calculate previous period daily revenue
    if (previousTransactions) {
      previousTransactions.filter(t => t.type === 'venda').forEach(t => {
        const date = format(new Date(t.createdAt), 'yyyy-MM-dd');
        previousDaily.set(date, (previousDaily.get(date) || 0) + t.total);
      });
    }

    // Generate daily data
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      dailyRevenue.push({
        date: dateStr,
        current: currentDaily.get(dateStr) || 0,
        previous: previousDaily.get(dateStr) || 0,
      });
    }

    return dailyRevenue;
  }

  public generateReport(filters: ReportFilters): PeriodComparison {
    const allTransactions = storageService.getTransactions();
    const allOrders = storageService.getServiceOrders();

    // Filter current period data
    const currentTransactions = this.filterTransactions(allTransactions, filters);
    const currentOrders = this.filterOrders(allOrders, filters);

    // Calculate previous period dates
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const previousStart = subDays(start, periodDays);
    const previousEnd = subDays(end, periodDays);

    const previousFilters: ReportFilters = {
      ...filters,
      startDate: format(previousStart, 'yyyy-MM-dd'),
      endDate: format(previousEnd, 'yyyy-MM-dd'),
    };

    // Filter previous period data
    const previousTransactions = this.filterTransactions(allTransactions, previousFilters);
    const previousOrders = this.filterOrders(allOrders, previousFilters);

    // Calculate analytics
    const current = this.calculateAnalytics(currentTransactions, currentOrders);
    const previous = this.calculateAnalytics(previousTransactions, previousOrders);

    // Calculate daily revenue with comparison
    current.dailyRevenue = this.calculateDailyRevenue(
      currentTransactions, 
      filters.startDate, 
      filters.endDate,
      previousTransactions
    );

    // Calculate deltas
    const deltas = {
      revenue: this.calculateDelta(current.revenue, previous.revenue),
      entries: this.calculateDelta(current.entries, previous.entries),
      exits: this.calculateDelta(current.exits, previous.exits),
      result: this.calculateDelta(current.result, previous.result),
      averageTicket: this.calculateDelta(current.averageTicket, previous.averageTicket),
      conversionRate: this.calculateDelta(current.conversionRate, previous.conversionRate),
    };

    return {
      current,
      previous,
      deltas,
    };
  }

  public getDefaultFilters(): ReportFilters {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      startDate: today,
      endDate: today,
      includeOSWithoutTransaction: true,
      transactionTypes: [],
      paymentMethods: [],
    };
  }

  public getPredefinedPeriods() {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const weekAgo = subDays(today, 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      today: {
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
        label: 'Hoje'
      },
      yesterday: {
        startDate: format(yesterday, 'yyyy-MM-dd'),
        endDate: format(yesterday, 'yyyy-MM-dd'),
        label: 'Ontem'
      },
      last7Days: {
        startDate: format(weekAgo, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
        label: 'Últimos 7 dias'
      },
      currentMonth: {
        startDate: format(monthStart, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
        label: 'Mês atual'
      }
    };
  }
}

export const analyticsService = new AnalyticsService();