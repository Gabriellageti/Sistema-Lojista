import { Transaction, ServiceOrder } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const paymentLabels = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  outros: 'Outros'
};

const statusLabels = {
  aberta: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

// Transaction exports (existing)
export const exportToCSV = (
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  filename?: string
) => {
  const headers = [
    'Data/Hora',
    'Tipo',
    'Descrição',
    'Quantidade',
    'Preço Unitário',
    'Total',
    'Forma de Pagamento',
    'Observações'
  ];

  const rows = transactions.map(transaction => [
    format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    getTypeLabel(transaction.type),
    transaction.description,
    transaction.quantity.toString(),
    `R$ ${transaction.unitPrice.toFixed(2)}`,
    `R$ ${transaction.total.toFixed(2)}`,
    getPaymentLabel(transaction.paymentMethod),
    transaction.notes || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  const defaultName = `lancamentos_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.csv`;
  link.setAttribute('download', filename || defaultName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  filename?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(62, 63, 147); // Sistema Lojista primary color
  doc.text('Sistema Lojista - Relatório de Lançamentos', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 30);
  doc.text(`Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`, 14, 38);
  doc.text(`Total de lançamentos: ${transactions.length}`, 14, 46);

  // Summary
  const totals = transactions.reduce((acc, t) => {
    switch (t.type) {
      case 'venda': acc.sales += t.total; break;
      case 'entrada': acc.entries += t.total; break;
      case 'saida': acc.exits += t.total; break;
      case 'despesa': acc.expenses += t.total; break;
    }
    return acc;
  }, { sales: 0, entries: 0, exits: 0, expenses: 0 });

  const balance = totals.entries + totals.sales - totals.exits - totals.expenses;

  doc.setFontSize(10);
  doc.text(`Vendas: R$ ${totals.sales.toFixed(2)}`, 14, 50);
  doc.text(`Entradas: R$ ${totals.entries.toFixed(2)}`, 14, 58);
  doc.text(`Saídas: R$ ${totals.exits.toFixed(2)}`, pageWidth/2, 50);
  doc.text(`Despesas: R$ ${totals.expenses.toFixed(2)}`, pageWidth/2, 58);
  
  doc.setFontSize(12);
  doc.setTextColor(balance >= 0 ? 0 : 255, balance >= 0 ? 150 : 0, 0);
  doc.text(`Saldo: R$ ${Math.abs(balance).toFixed(2)} ${balance >= 0 ? '(Positivo)' : '(Negativo)'}`, 14, 70);

  // Table
  const tableData = transactions.map(t => [
    format(new Date(t.createdAt), 'dd/MM HH:mm', { locale: ptBR }),
    getTypeLabel(t.type),
    t.description,
    t.quantity.toString(),
    `R$ ${t.unitPrice.toFixed(2)}`,
    `R$ ${t.total.toFixed(2)}`,
    getPaymentLabel(t.paymentMethod)
  ]);

  autoTable(doc, {
    head: [['Data/Hora', 'Tipo', 'Descrição', 'Qtd', 'Unit.', 'Total', 'Pagamento']],
    body: tableData,
    startY: 88,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [62, 63, 147], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 15 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 }
    }
  });

  const defaultName = `lancamentos_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.pdf`;
  doc.save(filename || defaultName);
};

// Service Orders exports (new)
export function exportOrdersToCSV(orders: ServiceOrder[], filename?: string): void {
  if (orders.length === 0) {
    alert('Não há dados para exportar');
    return;
  }

  const headers = ['ID', 'Data Criação', 'Cliente', 'Telefone', 'Descrição', 'Valor', 'Forma Pagamento', 'Status', 'Observações'];
  const rows = orders.map(order => [
    order.id,
    format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm'),
    order.customerName,
    order.customerPhone,
    order.description.replace(/"/g, '""'),
    `R$ ${order.value.toFixed(2)}`,
    paymentLabels[order.paymentMethod],
    statusLabels[order.status],
    (order.notes || '').replace(/"/g, '""')
  ]);

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Open in Google Sheets instead of downloading
  const encodedContent = encodeURIComponent(csvContent);
  const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/1z4-6xJbTQ4qO3F-6Mj_9zLUyh5R9LvWN9fOj8M3qB6E/edit#gid=0`;
  
  // Create a temporary form to submit CSV data to Google Sheets
  const formData = new FormData();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], filename || `ordens-servico-${format(new Date(), 'yyyy-MM-dd')}.csv`, { type: 'text/csv' });
  
  // Open Google Sheets and copy content to clipboard for easy import
  navigator.clipboard.writeText(csvContent).then(() => {
    window.open('https://sheets.google.com', '_blank');
    alert('Dados copiados para a área de transferência! Cole no Google Sheets usando Ctrl+V');
  }).catch(() => {
    // Fallback: download the file normally
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `ordens-servico-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

export function generateOrdersReport(orders: ServiceOrder[]) {
  const report = {
    totalOrders: orders.length,
    openOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalValue: 0,
    openValue: 0,
    completedValue: 0,
    averageValue: 0,
    paymentMethodBreakdown: {} as Record<string, number>
  };

  orders.forEach(order => {
    switch (order.status) {
      case 'aberta':
        report.openOrders++;
        report.openValue += order.value;
        break;
      case 'concluida':
        report.completedOrders++;
        report.completedValue += order.value;
        break;
      case 'cancelada':
        report.cancelledOrders++;
        break;
    }
    if (order.status !== 'cancelada') {
      report.totalValue += order.value;
    }
    const method = paymentLabels[order.paymentMethod];
    report.paymentMethodBreakdown[method] = (report.paymentMethodBreakdown[method] || 0) + 1;
  });

  const activeOrders = report.totalOrders - report.cancelledOrders;
  report.averageValue = activeOrders > 0 ? report.totalValue / activeOrders : 0;
  return report;
}

// Helper functions
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'venda': return 'Venda';
    case 'entrada': return 'Entrada';
    case 'saida': return 'Saída';
    case 'despesa': return 'Despesa';
    default: return type;
  }
};

const getPaymentLabel = (payment: string) => {
  switch (payment) {
    case 'dinheiro': return 'Dinheiro';
    case 'pix': return 'PIX';
    case 'cartao_debito': return 'C. Débito';
    case 'cartao_credito': return 'C. Crédito';
    case 'outros': return 'Outros';
    default: return payment;
  }
};
