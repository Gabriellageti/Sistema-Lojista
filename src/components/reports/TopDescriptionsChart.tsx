// Sistema Lojista - Top Descriptions Chart Component

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-variants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Download, Package } from 'lucide-react';

interface TopDescriptionsChartProps {
  data: Array<{ description: string; count: number; total: number }>;
  onExport?: () => void;
}

const chartConfig = {
  value: {
    label: "Valor",
    color: "hsl(var(--primary))",
  },
};

export function TopDescriptionsChart({ data, onExport }: TopDescriptionsChartProps) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'volume'>('revenue');

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const top5Data = data.slice(0, 5);

  const revenueData = top5Data.map(item => ({
    name: item.description.length > 20 ? item.description.substring(0, 20) + '...' : item.description,
    value: item.total,
    fullName: item.description,
  })).sort((a, b) => b.value - a.value);

  const volumeData = top5Data.map(item => ({
    name: item.description.length > 20 ? item.description.substring(0, 20) + '...' : item.description,
    value: item.count,
    fullName: item.description,
  })).sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top Produtos/Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Nenhuma venda encontrada no período
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
            <Package className="w-5 h-5" />
            Top Produtos/Serviços
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'revenue' | 'volume')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="revenue">Por Receita</TabsTrigger>
            <TabsTrigger value="volume">Por Volume</TabsTrigger>
          </TabsList>
          
          <TabsContent value="revenue">
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={revenueData} layout="vertical">
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[250px]"
                      formatter={(value, name, props) => [
                        formatCurrency(value as number),
                        props.payload?.fullName || name
                      ]}
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
          </TabsContent>
          
          <TabsContent value="volume">
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={volumeData} layout="vertical">
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[250px]"
                      formatter={(value, name, props) => [
                        `${value} vendas`,
                        props.payload?.fullName || name
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  fill="hsl(var(--secondary))"
                />
              </BarChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}