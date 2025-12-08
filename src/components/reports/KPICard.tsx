// Sistema Lojista - KPI Card Component

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  tooltip?: string;
  className?: string;
}

export function KPICard({ title, value, delta, deltaLabel, icon, tooltip, className }: KPICardProps) {
  const getDeltaColor = () => {
    if (delta === undefined || delta === 0) return 'text-muted-foreground';
    return delta > 0 ? 'text-emerald-600' : 'text-red-600';
  };

  const getDeltaIcon = () => {
    if (delta === undefined || delta === 0) return <Minus className="w-3 h-3" />;
    return delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const formatDelta = () => {
    if (delta === undefined) return null;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  };

  return (
    <Card className={cn("hs-card hover-scale", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <p className="text-2xl font-bold mb-1">{value}</p>
            
            {delta !== undefined && (
              <div className={cn("flex items-center gap-1 text-xs", getDeltaColor())}>
                {getDeltaIcon()}
                <span>{formatDelta()}</span>
                {deltaLabel && <span className="text-muted-foreground">vs {deltaLabel}</span>}
              </div>
            )}
          </div>
          
          {icon && (
            <div className="flex-shrink-0 ml-4">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}