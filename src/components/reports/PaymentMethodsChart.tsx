// Sistema Lojista - Payment Methods Chart Component

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-variants';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend } from 'recharts';
import { Download, CreditCard } from 'lucide-react';

interface PaymentMethodsChartProps {
  data: Record<string, number>;
  onExport?: () => void;
}

const chartConfig = {
  dinheiro: {
    label: "Dinheiro",
    color: "#10b981",
  },
  pix: {
    label: "PIX",
    color: "#3b82f6",
  },
  cartao_debito: {
    label: "Cartão Débito",
    color: "#8b5cf6",
  },
  cartao_credito: {
    label: "Cartão Crédito",
    color: "#f59e0b",
  },
  outros: {
    label: "Outros",
    color: "#6b7280",
  },
};

export function PaymentMethodsChart({ data, onExport }: PaymentMethodsChartProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const getMethodLabel = (method: string) => {
    return chartConfig[method as keyof typeof chartConfig]?.label || method;
  };

  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([method, value]) => ({
      method: getMethodLabel(method),
      value,
      fill: chartConfig[method as keyof typeof chartConfig]?.color || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Formas de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Nenhuma transação encontrada no período
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
            <CreditCard className="w-5 h-5" />
            Formas de Pagamento
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
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={chartData} layout="vertical">
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="method"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              width={100}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[200px]"
                  formatter={(value) => formatCurrency(value as number)}
                />
              }
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              fill="hsl(var(--primary))"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}