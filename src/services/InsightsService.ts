// Sistema Lojista - Insights Service

import { AnalyticsReport } from './AnalyticsServiceWithHooks';

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  action?: string;
}

class InsightsService {
  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_debito: 'Cartão Débito',
      cartao_credito: 'Cartão Crédito',
      outros: 'Outros',
    };
    return labels[method] || method;
  }

  private formatPercentage(value: number): string {
    const abs = Math.abs(value);
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${abs.toFixed(1)}%`;
  }

  private formatCurrency(value: number): string {
    return `R$ ${value.toFixed(2)}`;
  }

  generateInsights(report: AnalyticsReport): Insight[] {
    const insights: Insight[] = [];
    const { current, deltas } = report;

    // 1. Revenue Trend Analysis
    if (Math.abs(deltas.revenue) >= 5) {
      const type = deltas.revenue >= 0 ? 'positive' : 'negative';
      const trend = deltas.revenue >= 0 ? 'subiu' : 'caiu';
      const action = deltas.revenue < -20 
        ? 'Considere revisar estratégias de vendas e promoções.'
        : deltas.revenue > 20
        ? 'Mantenha as estratégias que estão funcionando!'
        : undefined;

      insights.push({
        type,
        title: `Receita ${trend} ${this.formatPercentage(deltas.revenue)}`,
        description: `Comparado ao período anterior, a receita ${trend} de ${this.formatCurrency(report.previous.revenue)} para ${this.formatCurrency(current.revenue)}.`,
        action,
      });
    }

    // 2. Payment Method Analysis
    const totalRevenue = Object.values(current.paymentMethods).reduce((sum, val) => sum + val, 0);
    if (totalRevenue > 0) {
      const dominantMethod = Object.entries(current.paymentMethods)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (dominantMethod) {
        const [method, amount] = dominantMethod;
        const percentage = (amount / totalRevenue) * 100;
        
        if (percentage >= 60) {
          insights.push({
            type: 'neutral',
            title: `${this.getPaymentMethodLabel(method)} domina com ${percentage.toFixed(1)}%`,
            description: `A forma de pagamento ${this.getPaymentMethodLabel(method)} representa a maior parte das vendas.`,
            action: percentage >= 80 ? 'Considere incentivar outras formas de pagamento para diversificar.' : undefined,
          });
        }
      }
    }

    // 3. Top Products/Services Analysis
    if (current.topDescriptions.length > 0) {
      const topItem = current.topDescriptions[0];
      const topPercentage = totalRevenue > 0 ? (topItem.total / totalRevenue) * 100 : 0;
      
      insights.push({
        type: 'positive',
        title: `"${topItem.description}" lidera vendas`,
        description: `Com ${topItem.count} vendas e ${this.formatCurrency(topItem.total)} em receita (${topPercentage.toFixed(1)}% do total).`,
        action: topPercentage >= 30 ? 'Considere criar combos ou destacar no atendimento.' : undefined,
      });
    }

    // 4. Service Orders Performance
    if (current.totalOrders > 0) {
      const conversionInsight: Insight = {
        type: current.conversionRate >= 70 ? 'positive' : current.conversionRate >= 50 ? 'neutral' : 'warning',
        title: `Taxa de conversão: ${current.conversionRate.toFixed(1)}%`,
        description: `De ${current.totalOrders} ordens de serviço, ${current.completedOrders} foram concluídas.`,
      };

      if (current.conversionRate < 50) {
        conversionInsight.action = 'Analise gargalos no atendimento ou adequação de preços.';
      } else if (current.conversionRate >= 80) {
        conversionInsight.action = 'Excelente! Mantenha o padrão de qualidade.';
      }

      insights.push(conversionInsight);
    }

    // 5. Average Ticket Analysis
    if (current.salesCount > 0 && Math.abs(deltas.averageTicket) >= 10) {
      const type = deltas.averageTicket >= 0 ? 'positive' : 'negative';
      const trend = deltas.averageTicket >= 0 ? 'aumentou' : 'diminuiu';
      
      insights.push({
        type,
        title: `Ticket médio ${trend} ${this.formatPercentage(deltas.averageTicket)}`,
        description: `O ticket médio ${trend} para ${this.formatCurrency(current.averageTicket)} (${current.salesCount} vendas).`,
        action: deltas.averageTicket < -15 ? 'Considere estratégias de upselling.' : undefined,
      });
    }

    // 6. Financial Health Alert
    if (current.result < 0) {
      insights.push({
        type: 'warning',
        title: `Resultado negativo: ${this.formatCurrency(current.result)}`,
        description: 'As saídas superam as entradas no período analisado.',
        action: 'Revise despesas e estratégias para aumentar receita.',
      });
    } else if (deltas.result < -50) {
      insights.push({
        type: 'warning',
        title: `Queda significativa no resultado`,
        description: `O resultado caiu ${this.formatPercentage(deltas.result)} comparado ao período anterior.`,
        action: 'Analise as causas da queda e tome ações corretivas.',
      });
    }

    // 7. Activity Level Assessment
    if (current.salesCount === 0) {
      insights.push({
        type: 'warning',
        title: 'Nenhuma venda registrada',
        description: 'Não foram encontradas vendas no período selecionado.',
        action: 'Verifique se todas as vendas foram lançadas corretamente.',
      });
    } else if (current.salesCount < 3 && report.previous.salesCount >= 10) {
      insights.push({
        type: 'warning',
        title: 'Baixa atividade de vendas',
        description: `Apenas ${current.salesCount} vendas registradas, bem abaixo do período anterior.`,
        action: 'Verifique possíveis problemas operacionais ou sazonalidade.',
      });
    }

    // Limit to 5 most relevant insights
    return insights.slice(0, 5);
  }

  generateQuickStats(report: AnalyticsReport): Array<{ label: string; value: string; trend?: string }> {
    const { current, deltas } = report;
    
    return [
      {
        label: 'Receita',
        value: this.formatCurrency(current.revenue),
        trend: Math.abs(deltas.revenue) >= 1 ? this.formatPercentage(deltas.revenue) : undefined,
      },
      {
        label: 'Ticket Médio',
        value: this.formatCurrency(current.averageTicket),
        trend: Math.abs(deltas.averageTicket) >= 1 ? this.formatPercentage(deltas.averageTicket) : undefined,
      },
      {
        label: 'Conversão OS',
        value: `${current.conversionRate.toFixed(1)}%`,
        trend: Math.abs(deltas.conversionRate) >= 1 ? this.formatPercentage(deltas.conversionRate) : undefined,
      },
      {
        label: 'Resultado',
        value: this.formatCurrency(current.result),
        trend: Math.abs(deltas.result) >= 1 ? this.formatPercentage(deltas.result) : undefined,
      },
    ];
  }
}

export const insightsService = new InsightsService();