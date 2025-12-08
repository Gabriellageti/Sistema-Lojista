// Help Smart - Report Filters Component

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { ReportFilters as IReportFilters } from '@/services/AnalyticsServiceWithHooks';
import { cn } from '@/lib/utils';

interface ReportFiltersProps {
  filters: IReportFilters;
  onChange: (filters: IReportFilters) => void;
  predefinedPeriods: {
    today: { startDate: string; endDate: string; label: string };
    yesterday: { startDate: string; endDate: string; label: string };
    last7Days: { startDate: string; endDate: string; label: string };
    currentMonth: { startDate: string; endDate: string; label: string };
  };
}

const transactionTypes: Array<{ value: 'venda' | 'entrada' | 'saida' | 'despesa'; label: string }> = [
  { value: 'venda', label: 'Vendas' },
  { value: 'entrada', label: 'Entradas' },
  { value: 'saida', label: 'Saídas' },
  { value: 'despesa', label: 'Despesas' },
];

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'outros', label: 'Outros' },
];

export function ReportFilters({ filters, onChange, predefinedPeriods }: ReportFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handlePredefinedPeriod = (period: { startDate: string; endDate: string }) => {
    onChange({
      ...filters,
      startDate: period.startDate,
      endDate: period.endDate,
    });
  };

  const handleTransactionTypeChange = (type: 'venda' | 'entrada' | 'saida' | 'despesa', checked: boolean) => {
    const newTypes = checked
      ? [...filters.transactionTypes, type]
      : filters.transactionTypes.filter(t => t !== type);
    
    onChange({
      ...filters,
      transactionTypes: newTypes,
    });
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    const newMethods = checked
      ? [...filters.paymentMethods, method]
      : filters.paymentMethods.filter(m => m !== method);
    
    onChange({
      ...filters,
      paymentMethods: newMethods,
    });
  };

  const resetFilters = () => {
    onChange({
      ...filters,
      includeOSWithoutTransaction: true,
      transactionTypes: [],
      paymentMethods: [],
    });
  };

  const hasActiveFilters = 
    !filters.includeOSWithoutTransaction ||
    filters.transactionTypes.length > 0 ||
    filters.paymentMethods.length > 0;

  return (
    <Card className="hs-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filtros do Relatório
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Período</Label>
          
          {/* Predefined Periods */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(predefinedPeriods).map(([key, period]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => handlePredefinedPeriod(period)}
                className={cn(
                  "text-xs",
                  filters.startDate === period.startDate && 
                  filters.endDate === period.endDate && 
                  "bg-primary/10 border-primary"
                )}
              >
                {period.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startDate" className="text-xs">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros Avançados</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isAdvancedOpen && "rotate-180")} />
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-auto text-xs">
                Ativo
              </Badge>
            )}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Include OS Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Incluir OS sem lançamento</Label>
                <p className="text-xs text-muted-foreground">
                  Incluir ordens de serviço que não geraram transações financeiras
                </p>
              </div>
              <Switch
                checked={filters.includeOSWithoutTransaction}
                onCheckedChange={(checked) => onChange({ ...filters, includeOSWithoutTransaction: checked })}
              />
            </div>

            {/* Transaction Types */}
            <div className="space-y-3">
              <Label className="text-sm">Tipos de Lançamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {transactionTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={filters.transactionTypes.includes(type.value)}
                      onCheckedChange={(checked) => 
                        handleTransactionTypeChange(type.value, checked as boolean)
                      }
                    />
                    <Label htmlFor={type.value} className="text-sm">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="text-sm">Formas de Pagamento</Label>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <Badge
                    key={method.value}
                    variant={filters.paymentMethods.includes(method.value) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => 
                      handlePaymentMethodChange(
                        method.value, 
                        !filters.paymentMethods.includes(method.value)
                      )
                    }
                  >
                    {method.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}