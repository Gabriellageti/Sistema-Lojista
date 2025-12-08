import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, FileText, DollarSign } from 'lucide-react';
import { ServiceOrder, OrderStatus } from '@/types';
import { subDays, isAfter, isToday, isYesterday, startOfMonth, endOfMonth, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface OSStatsProps {
  orders: ServiceOrder[];
  dateFilter?: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom';
  customDateRange?: { start: Date | null; end: Date | null };
  onStatusClick?: (status: OrderStatus | 'all') => void;
  selectedStatus?: OrderStatus | 'all';
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: { value: number; isPositive: boolean };
  tooltip?: string;
  onClick?: () => void;
  isClickable?: boolean;
  isSelected?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend, tooltip, onClick, isClickable, isSelected }: StatCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          className={cn(
            "hs-card transition-all duration-200",
            isClickable ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg" : "cursor-help",
            isSelected && "ring-2 ring-primary/70 shadow-lg border border-primary/40"
          )}
          onClick={onClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{title}</p>
                <div className="flex items-baseline gap-2">
                  <p className={cn("text-2xl font-bold", color)}>
                    {typeof value === 'number' && title.includes('Valor') 
                      ? `R$ ${value.toFixed(2)}` 
                      : value
                    }
                  </p>
                  {trend && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      trend.isPositive ? "text-emerald-600" : "text-red-600"
                    )}>
                      {trend.isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(trend.value)}%
                    </div>
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <Icon className={cn("w-8 h-8", color)} />
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      {tooltip && (
        <TooltipContent>
          <p className="max-w-xs">{tooltip}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export default function OSStats({
  orders,
  dateFilter = 'all',
  customDateRange = { start: null, end: null },
  onStatusClick,
  selectedStatus = 'all',
}: OSStatsProps) {
  const stats = useMemo(() => {
    // Filter orders based on the current date filter
    const getFilteredOrders = (ordersToFilter: ServiceOrder[]) => {
      if (dateFilter === 'all') return ordersToFilter;
      
      const now = new Date();
      return ordersToFilter.filter(order => {
        const orderDate = new Date(order.createdAt);
        
        switch (dateFilter) {
          case 'today':
            return isToday(orderDate);
          
          case 'yesterday':
            return isYesterday(orderDate);
          
          case '7days':
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            return isAfter(orderDate, sevenDaysAgo);
          
          case 'month':
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            return isAfter(orderDate, monthStart) && isBefore(orderDate, monthEnd);
          
          case 'custom':
            if (!customDateRange.start || !customDateRange.end) {
              return true;
            }
            const rangeStart = startOfDay(customDateRange.start);
            const rangeEnd = endOfDay(customDateRange.end);
            return isAfter(orderDate, rangeStart) && isBefore(orderDate, rangeEnd);
          
          default:
            return true;
        }
      });
    };

    // Get current period orders based on filter
    const currentPeriodOrders = getFilteredOrders(orders);
    
    // Calculate previous period for trend (only for 7days filter)
    let previousPeriodOrders: ServiceOrder[] = [];
    if (dateFilter === '7days') {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const fourteenDaysAgo = subDays(now, 14);
      
      previousPeriodOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return isAfter(orderDate, fourteenDaysAgo) && !isAfter(orderDate, sevenDaysAgo);
      });
    }

    // Calculate current stats
    const openOrders = currentPeriodOrders.filter(o => o.status === 'aberta');
    const completedOrders = currentPeriodOrders.filter(o => o.status === 'concluida');
    const totalOrders = currentPeriodOrders.length;
    const openValue = openOrders.reduce((sum, o) => sum + o.value, 0);

    // Calculate trends (only for 7days filter)
    let openTrend = null;
    let completedTrend = null;
    
    if (dateFilter === '7days' && previousPeriodOrders.length > 0) {
      const prevOpenCount = previousPeriodOrders.filter(o => o.status === 'aberta').length;
      const prevCompletedCount = previousPeriodOrders.filter(o => o.status === 'concluida').length;
      
      openTrend = prevOpenCount > 0 
        ? { value: Math.round(((openOrders.length - prevOpenCount) / prevOpenCount) * 100), isPositive: openOrders.length < prevOpenCount }
        : null;
      
      completedTrend = prevCompletedCount > 0 
        ? { value: Math.round(((completedOrders.length - prevCompletedCount) / prevCompletedCount) * 100), isPositive: completedOrders.length > prevCompletedCount }
        : null;
    }

    return {
      open: { count: openOrders.length, trend: openTrend },
      completed: { count: completedOrders.length, trend: completedTrend },
      total: { count: totalOrders },
      openValue: { value: openValue }
    };
  }, [orders, dateFilter, customDateRange]);

  const getPeriodLabel = () => {
    switch (dateFilter) {
      case 'today':
        return 'Hoje';
      case 'yesterday':
        return 'Ontem';
      case '7days':
        return 'Últimos 7 dias';
      case 'month':
        return 'Mês atual';
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          return 'Período personalizado';
        }
        return 'Todas';
      default:
        return 'Todas';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Abertas"
        value={stats.open.count}
        subtitle={getPeriodLabel()}
        icon={Clock}
        color="text-amber-600"
        trend={stats.open.trend || undefined}
        tooltip="Clique para filtrar apenas as ordens em aberto do período selecionado."
        onClick={() => onStatusClick?.('aberta')}
        isClickable={!!onStatusClick}
        isSelected={selectedStatus === 'aberta'}
      />

      <StatCard
        title="Concluídas"
        value={stats.completed.count}
        subtitle={getPeriodLabel()}
        icon={CheckCircle2}
        color="text-emerald-600"
        trend={stats.completed.trend || undefined}
        tooltip="Clique para filtrar apenas as ordens concluídas do período selecionado."
        onClick={() => onStatusClick?.('concluida')}
        isClickable={!!onStatusClick}
        isSelected={selectedStatus === 'concluida'}
      />

      <StatCard
        title="Total OS"
        value={stats.total.count}
        subtitle={getPeriodLabel()}
        icon={FileText}
        color="text-primary"
        tooltip="Clique para ver todas as ordens do período selecionado."
        onClick={() => onStatusClick?.('all')}
        isClickable={!!onStatusClick}
        isSelected={selectedStatus === 'all'}
      />

      <StatCard
        title="Valor em Aberto"
        value={stats.openValue.value}
        subtitle="Pendentes de recebimento"
        icon={DollarSign}
        color="text-primary"
        tooltip="Valor total das ordens de serviço em aberto que ainda precisam ser recebidas."
        onClick={() => onStatusClick?.('aberta')}
        isClickable={!!onStatusClick}
        isSelected={selectedStatus === 'aberta'}
      />
    </div>
  );
}