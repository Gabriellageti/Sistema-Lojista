// Sistema Lojista - Insights Card Component

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import { Insight } from '@/services/InsightsService';
import { cn } from '@/lib/utils';

interface InsightsCardProps {
  insights: Insight[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'negative':
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getInsightBadgeVariant = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (insights.length === 0) {
    return (
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            O que observar agora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Não há dados suficientes para gerar insights no período selecionado
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hs-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          O que observar agora
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border border-border/50 animate-fade-in",
                insight.type === 'positive' && "bg-emerald-50/50 border-emerald-200/50",
                insight.type === 'negative' && "bg-red-50/50 border-red-200/50",
                insight.type === 'warning' && "bg-amber-50/50 border-amber-200/50",
                insight.type === 'neutral' && "bg-blue-50/50 border-blue-200/50"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <Badge variant={getInsightBadgeVariant(insight.type)} className="text-xs">
                      {insight.type === 'positive' && 'Positivo'}
                      {insight.type === 'negative' && 'Atenção'}
                      {insight.type === 'warning' && 'Alerta'}
                      {insight.type === 'neutral' && 'Info'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {insight.description}
                  </p>
                  {insight.action && (
                    <p className="text-xs font-medium text-primary">
                      💡 {insight.action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}