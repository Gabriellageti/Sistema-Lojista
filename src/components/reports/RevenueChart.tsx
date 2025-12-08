// Sistema Lojista - Revenue Chart Component

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-variants';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Legend } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RevenueChartProps {
  data: Array<{ date: string; current: number; previous: number }>;
  onExport?: () => void;
}

const chartConfig = {
  current: {
    label: "Período Atual",
    color: "hsl(var(--primary))",
  },
  previous: {
    label: "Período Anterior", 
    color: "hsl(var(--muted-foreground))",
  },
};

export function RevenueChart({ data, onExport }: RevenueChartProps) {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM', { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const chartData = data.map(item => ({
    ...item,
    date: formatDate(item.date),
  }));

  return (
    <Card className="hs-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Receita Diária
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
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPrevious" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--muted-foreground))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--muted-foreground))"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[200px]"
                  formatter={(value) => formatCurrency(value as number)}
                />
              }
            />
            <Legend />
            <Area
              dataKey="previous"
              type="monotone"
              fill="url(#fillPrevious)"
              fillOpacity={0.4}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              name="Período Anterior"
            />
            <Area
              dataKey="current"
              type="monotone"
              fill="url(#fillCurrent)"
              fillOpacity={0.4}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Período Atual"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}