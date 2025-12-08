import { useState, useEffect } from 'react';
import { Search, X, Calendar, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { OrderStatus, PaymentMethod } from '@/types';

interface OSFiltersProps {
  searchTerm: string;
  onSearchChange: (search: string) => void;
  statusFilter: OrderStatus | 'all';
  onStatusChange: (status: OrderStatus | 'all') => void;
  paymentFilter: PaymentMethod | 'all';
  onPaymentChange: (payment: PaymentMethod | 'all') => void;
  dateFilter: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom';
  onDateFilterChange: (filter: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom') => void;
  customDateRange: { start: Date | null; end: Date | null };
  onCustomDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const statusOptions = [
  { value: 'all' as const, label: 'Todos', color: 'bg-muted' },
  { value: 'aberta' as const, label: 'Abertas', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  { value: 'concluida' as const, label: 'Concluídas', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  { value: 'cancelada' as const, label: 'Canceladas', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
];

const paymentOptions = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'pix' as const, label: 'PIX' },
  { value: 'dinheiro' as const, label: 'Dinheiro' },
  { value: 'cartao_credito' as const, label: 'Crédito' },
  { value: 'cartao_debito' as const, label: 'Débito' },
  { value: 'outros' as const, label: 'Outros' }
];

const dateOptions = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'today' as const, label: 'Hoje' },
  { value: 'yesterday' as const, label: 'Ontem' },
  { value: '7days' as const, label: 'Últimos 7 dias' },
  { value: 'month' as const, label: 'Mês atual' },
  { value: 'custom' as const, label: 'Período personalizado' }
];

export default function OSFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  paymentFilter,
  onPaymentChange,
  dateFilter,
  onDateFilterChange,
  customDateRange,
  onCustomDateRangeChange,
  onClearFilters,
  hasActiveFilters
}: OSFiltersProps) {
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  
  return (
    <Card className="hs-card">
      <CardContent className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por cliente, telefone ou descrição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 h-11"
          />
        </div>

        {/* Filter Sections */}
        <div className="space-y-3">
          {/* Status Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Status</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={statusFilter === option.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105 px-3 py-1",
                    statusFilter === option.value && option.color
                  )}
                  onClick={() => onStatusChange(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Payment Filter */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Forma de Pagamento</span>
            <div className="flex flex-wrap gap-2">
              {paymentOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={paymentFilter === option.value ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105 px-3 py-1"
                  onClick={() => onPaymentChange(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Período</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dateOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={dateFilter === option.value ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105 px-3 py-1"
                  onClick={() => onDateFilterChange(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    {customDateRange.start && customDateRange.end 
                      ? `${format(customDateRange.start, 'dd/MM')} - ${format(customDateRange.end, 'dd/MM')}`
                      : "Selecionar período"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex">
                    <CalendarComponent
                      mode="range"
                      selected={{
                        from: customDateRange.start || undefined,
                        to: customDateRange.end || undefined,
                      }}
                      onSelect={(range) => {
                        onCustomDateRangeChange({
                          start: range?.from || null,
                          end: range?.to || null
                        });
                      }}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-border">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-2" />
                Limpar todos os filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}