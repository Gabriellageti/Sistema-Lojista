import { useMemo } from 'react';
import { ServiceOrder } from '@/types';
import OSCard from './OSCard';
import { format, isToday, isYesterday } from 'date-fns';

interface OSListProps {
  orders: ServiceOrder[];
  onEdit: (order: ServiceOrder) => void;
  onDelete: (id: string) => void;
  onPrint: (order: ServiceOrder) => void;
  onStatusChange: (id: string, status: 'aberta' | 'concluida' | 'cancelada') => void;
}

function getDateGroupLabel(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, 'dd/MM/yyyy');
}

export default function OSList({ orders, onEdit, onDelete, onPrint, onStatusChange }: OSListProps) {
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: { label: string; orders: ServiceOrder[] } } = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: getDateGroupLabel(date),
          orders: []
        };
      }
      
      groups[dateKey].orders.push(order);
    });
    
    // Sort groups by date (newest first) and orders within each group by time (newest first)
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, group]) => ({
        dateKey,
        label: group.label,
        orders: group.orders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }));
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">📋</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhuma ordem de serviço encontrada
        </h3>
        <p className="text-muted-foreground mb-4">
          Não há ordens de serviço que correspondam aos filtros aplicados.
        </p>
        <div className="flex gap-2">
          <button className="text-primary hover:underline text-sm">
            Nova OS
          </button>
          <span className="text-muted-foreground">•</span>
          <button className="text-primary hover:underline text-sm">
            Limpar filtros
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedOrders.map(({ dateKey, label, orders: groupOrders }) => (
        <div key={dateKey} className="space-y-4">
          {/* Date Group Header */}
          <div className="flex items-center">
            <div className="flex-1 h-px bg-border"></div>
            <div className="px-4 py-2 bg-muted rounded-full text-sm font-medium text-muted-foreground">
              {label}
              <span className="ml-2 text-xs bg-background px-2 py-1 rounded-full">
                {groupOrders.length}
              </span>
            </div>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Orders in this date group */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupOrders.map(order => (
              <OSCard
                key={order.id}
                order={order}
                onEdit={onEdit}
                onDelete={onDelete}
                onPrint={onPrint}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}