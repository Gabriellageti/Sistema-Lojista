// Sistema Lojista - Transaction Filters Component

import { useState } from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TransactionType, PaymentMethod } from '@/types';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FilterState {
  searchTerm: string;
  dateFilter: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom';
  customDateStart?: Date;
  customDateEnd?: Date;
  typeFilter: TransactionType | 'all';
  paymentFilter: PaymentMethod | 'all';
}

interface TransactionFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const TransactionFilters = ({ filters, onFiltersChange }: TransactionFiltersProps) => {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const dateFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: '7days', label: '7 dias' },
    { value: 'month', label: 'Mês atual' },
    { value: 'custom', label: 'Personalizado' }
  ];

  const typeOptions = [
    { value: 'all', label: 'Todos', color: 'bg-muted text-muted-foreground' },
    { value: 'venda', label: 'Venda', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'entrada', label: 'Entrada', color: 'bg-blue-100 text-blue-700' },
    { value: 'saida', label: 'Saída', color: 'bg-orange-100 text-orange-700' },
    { value: 'despesa', label: 'Despesa', color: 'bg-red-100 text-red-700' }
  ];

  const paymentOptions = [
    { value: 'all', label: 'Todos', color: 'bg-muted text-muted-foreground' },
    { value: 'pix', label: 'PIX', color: 'bg-purple-100 text-purple-700' },
    { value: 'dinheiro', label: 'Dinheiro', color: 'bg-green-100 text-green-700' },
    { value: 'cartao_credito', label: 'C. Crédito', color: 'bg-blue-100 text-blue-700' },
    { value: 'cartao_debito', label: 'C. Débito', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'outros', label: 'Outros', color: 'bg-gray-100 text-gray-700' }
  ];

  const handleDateFilterChange = (value: string) => {
    const newFilters = { ...filters, dateFilter: value as FilterState['dateFilter'] };
    
    // Reset custom dates if not custom filter
    if (value !== 'custom') {
      newFilters.customDateStart = undefined;
      newFilters.customDateEnd = undefined;
    }
    
    onFiltersChange(newFilters);
    setShowCustomDatePicker(value === 'custom');
  };

  const handleCustomDateSelect = (date: Date | undefined, isStart: boolean) => {
    const newFilters = { ...filters };
    if (isStart) {
      newFilters.customDateStart = date;
    } else {
      newFilters.customDateEnd = date;
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      dateFilter: 'all',
      typeFilter: 'all',
      paymentFilter: 'all'
    });
    setShowCustomDatePicker(false);
  };

  const hasActiveFilters = 
    filters.searchTerm !== '' || 
    filters.dateFilter !== 'all' || 
    filters.typeFilter !== 'all' || 
    filters.paymentFilter !== 'all';

  const getDateRangeDisplay = () => {
    if (filters.dateFilter === 'custom' && filters.customDateStart && filters.customDateEnd) {
      return `${format(filters.customDateStart, 'dd/MM', { locale: ptBR })} - ${format(filters.customDateEnd, 'dd/MM', { locale: ptBR })}`;
    }
    return dateFilterOptions.find(opt => opt.value === filters.dateFilter)?.label || 'Todos';
  };

  return (
    <Card className="hs-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por descrição..."
            value={filters.searchTerm}
            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Período</label>
          <div className="flex flex-wrap gap-2">
            {dateFilterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filters.dateFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleDateFilterChange(option.value)}
                className="h-8 text-xs"
              >
                <Calendar className="w-3 h-3 mr-1" />
                {option.value === 'custom' && filters.dateFilter === 'custom' 
                  ? getDateRangeDisplay() 
                  : option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {showCustomDatePicker && (
          <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-2">Data inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.customDateStart && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.customDateStart ? (
                        format(filters.customDateStart, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Selecione a data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.customDateStart}
                      onSelect={(date) => handleCustomDateSelect(date, true)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Data final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.customDateEnd && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.customDateEnd ? (
                        format(filters.customDateEnd, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Selecione a data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.customDateEnd}
                      onSelect={(date) => handleCustomDateSelect(date, false)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Type Chips */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo</label>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((type) => (
              <Button
                key={type.value}
                variant={filters.typeFilter === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => onFiltersChange({ ...filters, typeFilter: type.value as TransactionType | 'all' })}
                className={cn(
                  "h-8 text-xs",
                  filters.typeFilter !== type.value && type.color
                )}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Payment Method Chips */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Forma de Pagamento</label>
          <div className="flex flex-wrap gap-2">
            {paymentOptions.map((payment) => (
              <Button
                key={payment.value}
                variant={filters.paymentFilter === payment.value ? "default" : "outline"}
                size="sm"
                onClick={() => onFiltersChange({ ...filters, paymentFilter: payment.value as PaymentMethod | 'all' })}
                className={cn(
                  "h-8 text-xs",
                  filters.paymentFilter !== payment.value && payment.color
                )}
              >
                {payment.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionFilters;
export type { FilterState };