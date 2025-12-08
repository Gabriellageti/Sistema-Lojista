// Sistema Lojista - Orders Funnel Chart Component

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-variants';
import { Progress } from '@/components/ui/progress';
import { Download, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrdersFunnelChartProps {
  data: { open: number; completed: number; cancelled: number };
  onExport?: () => void;
}

export function OrdersFunnelChart({ data, onExport }: OrdersFunnelChartProps) {
  const total = data.open + data.completed + data.cancelled;
  
  const calculatePercentage = (value: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  const conversionRate = total > 0 ? (data.completed / total) * 100 : 0;

  const funnelSteps = [
    {
      label: 'Abertas',
      value: data.open,
      percentage: calculatePercentage(data.open),
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
    },
    {
      label: 'Concluídas',
      value: data.completed,
      percentage: calculatePercentage(data.completed),
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Canceladas',
      value: data.cancelled,
      percentage: calculatePercentage(data.cancelled),
      color: 'bg-red-500',
      textColor: 'text-red-700',
    },
  ];

  if (total === 0) {
    return (
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Funil de Ordens de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Filter className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Nenhuma ordem de serviço encontrada no período
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hs-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Funil de Ordens de Serviço
          </CardTitle>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              PNG
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Conversion Rate Summary */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold mb-1">
              {conversionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Taxa de Conversão ({data.completed} de {total} ordens)
            </div>
          </div>

          {/* Funnel Steps */}
          <div className="space-y-4">
            {funnelSteps.map((step, index) => (
              <div key={step.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", step.color)} />
                    <span className="font-medium">{step.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{step.value}</div>
                    <div className={cn("text-xs", step.textColor)}>
                      {step.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <Progress 
                  value={step.percentage} 
                  className="h-2"
                />
                
                {index < funnelSteps.length - 1 && (
                  <div className="flex justify-center">
                    <div className="w-px h-4 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="mt-6 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
            <div className="text-sm">
              <strong>Insight:</strong>{' '}
              {conversionRate >= 70 
                ? '✅ Excelente taxa de conversão! Mantenha o padrão.'
                : conversionRate >= 50
                ? '⚠️ Taxa de conversão razoável. Há espaço para melhorias.'
                : '🚨 Taxa de conversão baixa. Analise os gargalos no processo.'
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}