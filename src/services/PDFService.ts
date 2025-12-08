// Help Smart - PDF Receipt Generation Service

import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin, type CellInput, type UserOptions } from 'jspdf-autotable';

applyPlugin(jsPDF);
import {
  Transaction,
  ServiceOrder,
  ReceiptConfig,
  PaymentSplit,
  PaymentMethod,
  OrderStatus,
  TransactionType,
  CreditSale,
  CreditSalePayment,
} from '@/types';
import { format } from 'date-fns';

// Log para verificar se o módulo está carregando
console.log('📦 PDFService módulo carregado');
console.log('🔧 jsPDF disponível:', typeof jsPDF);

// Teste básico do jsPDF
try {
  const testDoc = new jsPDF();
  console.log('✅ jsPDF funcionando corretamente');
} catch (error) {
  console.error('❌ Erro ao inicializar jsPDF:', error);
}

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => void;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface ReceiptData {
  id: string;
  dataHora: string;
  itens?: Array<{
    descricao: string;
    qtde: number;
    total: number;
  }>;
  subtotal?: number;
  formaPagamento: string;
  clienteNome?: string;
  clienteTelefone?: string;
  descricao?: string;
  valor?: number;
  status?: string;
  detailTable?: {
    head: string[];
    body: string[][];
    columnStyles?: UserOptions['columnStyles'];
  };
  summaryRows?: Array<{
    label: string;
    value: string;
  }>;
}

const paymentLabels: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  outros: 'Outros'
};

const statusLabels: Record<OrderStatus, string> = {
  aberta: 'Aberta',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

const transactionTypeLabels: Record<TransactionType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  venda: 'Venda',
  despesa: 'Despesa'
};

// Margem padrão utilizada nas impressões (em milímetros)
const DEFAULT_MARGIN = 7.5;


const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return 'R$ 0,00';
  return `R$ ${value.toFixed(2)}`;
};

const formatPaymentDetails = (paymentMethod: PaymentMethod, splits?: PaymentSplit[]) => {
  if (splits && splits.length > 0) {
    return splits
      .map(split => `${paymentLabels[split.method]} - ${formatCurrency(split.amount)}`)
      .join('\n');
  }
  return paymentLabels[paymentMethod] || paymentMethod.toUpperCase();
};

// ===================
// Funções de cálculo
// ===================

function calculateRequiredHeight(type: 'venda' | 'os', data: ReceiptData, config: ReceiptConfig): number {
  console.log('🎯 === INICIANDO CÁLCULO PRECISO DE ALTURA ===');
  console.log('Tipo:', type, 'Dados:', data, 'Config:', config);
  
  const tempDoc = new jsPDF({
    unit: "mm",
    format: [config.larguraBobina || 58, 200],
    orientation: 'portrait'
  });

  let y = 8;
  const width = config.larguraBobina || 58;
  const margin = DEFAULT_MARGIN;
  const contentWidth = width - margin * 2;
  
  // HEADER
  tempDoc.setFontSize(12);
  y += 6;
  
  tempDoc.setFontSize(8);
  const storeCnpj = (config.cnpjLoja || '57.550.258/0001-89').trim();
  if (storeCnpj) y += 4;
  if (config.telefoneLoja) y += 4;
  if (config.instagramLoja) y += 4;
  
  if (config.enderecoLoja && config.enderecoLoja.trim()) {
    tempDoc.setFontSize(7);
    const enderecoLines = tempDoc.splitTextToSize(config.enderecoLoja.trim(), contentWidth);
    y += enderecoLines.length * 3 + 2;
  }
  
  y += 5; // Separator
  y += 4; // Document ID
  y += 5; // Date/time
  y += 4; // Separator

  // CONTENT
  if (type === "venda") {
    const tableRows = data.detailTable?.body?.length || data.itens?.length || 0;
    if (tableRows > 0) {
      y += 6; // header spacing
      y += tableRows * 8;
      const extraLines = data.detailTable?.body?.reduce((acc, row) => {
        return acc + row.reduce((inner, cell) => inner + ((cell.match(/\n/g)?.length || 0)), 0);
      }, 0) || 0;
      y += extraLines * 4;
    }
    if (data.summaryRows?.length) {
      y += 4;
      y += (data.summaryRows.length + 1) * 6;
      const summaryExtra = data.summaryRows.reduce((acc, row) => acc + ((row.value.match(/\n/g)?.length || 0)), 0);
      y += summaryExtra * 4;
    }
  }

  if (type === "os") {
    const tableRows = data.detailTable?.body?.length || 0;
    if (tableRows > 0) {
      y += 6; // header spacing
      y += tableRows * 8;
      const extraLines = data.detailTable?.body?.reduce((acc, row) => {
        return acc + row.reduce((inner, cell) => inner + ((cell.match(/\n/g)?.length || 0)), 0);
      }, 0) || 0;
      y += extraLines * 4;
    }
    if (data.summaryRows?.length) {
      y += 4;
      y += (data.summaryRows.length + 1) * 6;
      const summaryExtra = data.summaryRows.reduce((acc, row) => acc + ((row.value.match(/\n/g)?.length || 0)), 0);
      y += summaryExtra * 4;
    }
  }

  // FOOTER
  y += 7;
  if (config.mensagemAgradecimento && config.mensagemAgradecimento.trim()) y += 4;
  if (config.instagramLoja) y += 4;
  y += 3;

  if (config.politicaGarantia && config.politicaGarantia.trim()) {
    y += 4;
    tempDoc.setFontSize(6);
    const realWarrantyLines = tempDoc.splitTextToSize(config.politicaGarantia.trim(), contentWidth);
    y += realWarrantyLines.length * 3;
  }

  const calculatedHeight = y + 50;
  const finalHeight = Math.max(calculatedHeight, 150);
  
  return finalHeight;
}

// ===================
// Geração principal
// ===================

export function generateReceiptPDF(type: 'venda' | 'os', data: ReceiptData, config: ReceiptConfig): string {
  if (!data || !data.id) {
    alert('Dados inválidos para gerar o PDF');
    return '';
  }

  if (!config) {
    config = {
      nomeLoja: 'HELP SMART',
      larguraBobina: 58,
      telefoneLoja: '',
      cnpjLoja: '',
      instagramLoja: '',
      enderecoLoja: '',
      mensagemAgradecimento: 'Obrigado pela preferência!',
      politicaGarantia: ''
    };
  }

  return generatePDFWithRetry(type, data, config, 1);
}

function generatePDFWithRetry(type: 'venda' | 'os', data: ReceiptData, config: ReceiptConfig, attempt: number, previousHeight?: number): string {
  const maxAttempts = 3;
  
  try {
    let requiredHeight = calculateRequiredHeight(type, data, config);
    if (attempt > 1 && previousHeight) {
      requiredHeight = previousHeight + 100 * attempt;
    }
    
    const doc = new jsPDF({
      unit: "mm",
      format: [config.larguraBobina || 58, requiredHeight],
      orientation: 'portrait'
    });

    doc.setTextColor(0, 0, 0);

    const width = config.larguraBobina || 58;
    const margin = DEFAULT_MARGIN;

    const finalY = renderPDFContent(doc, type, data, config, width, margin, 8);
    
    const usedHeight = finalY + 10;
    const availableHeight = requiredHeight - 20;
    
    if (usedHeight > availableHeight && attempt < maxAttempts) {
      return generatePDFWithRetry(type, data, config, attempt + 1, requiredHeight);
    }
    
    return openPDFWithFallback(doc, data.id);

  } catch (error) {
    if (attempt < maxAttempts) {
      return generatePDFWithRetry(type, data, config, attempt + 1);
    }
    alert(`Erro ao gerar PDF após ${maxAttempts} tentativas: ${error.message}`);
    return '';
  }
}

// ===================
// Renderização
// ===================

function renderPDFContent(doc: jsPDF, type: 'venda' | 'os', data: ReceiptData, config: ReceiptConfig, width: number, margin: number, startY: number): number {
  let y = startY;
  const contentWidth = width - margin * 2;
  
  // HEADER
  y = renderStoreHeader(doc, config, width, margin, y, { nameFontSize: 12, infoFontSize: 8 });
  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text("=".repeat(Math.floor(width/2)), width/2, y, { align: "center" });
  y += 5;
  
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text(`${type.toUpperCase()} #${data.id}`, width/2, y, { align: "center" });
  y += 4;
  
  doc.setFont("helvetica", "normal").setFontSize(7);
  doc.text(`Data/Hora: ${data.dataHora || 'N/A'}`, margin, y); 
  y += 5;
  
  doc.setFontSize(6);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y); 
  y += 4;

  if (type === "venda" && (data.detailTable?.body?.length || data.itens?.length)) {
    y = renderVendaSection(doc, data, width, margin, y);
  }
  if (type === "os") y = renderOSSection(doc, data, width, margin, y);

  y = renderFooterSection(doc, config, width, margin, y);
  
  return y;
}

// ===================
// Seções específicas
// ===================

function renderVendaSection(doc: jsPDF, data: ReceiptData, width: number, margin: number, y: number): number {
  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("DETALHES DA VENDA:", margin, y);
  y += 4;

  const tableWidth = width - margin * 2;

  if (data.detailTable?.body?.length) {
    autoTable(doc, {
      startY: y,
      head: [data.detailTable.head],
      body: data.detailTable.body,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [62, 63, 147],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.2,
      columnStyles: data.detailTable.columnStyles || {
        0: { cellWidth: tableWidth * 0.18, halign: 'center' },
        1: { cellWidth: tableWidth * 0.2 },
        2: { cellWidth: tableWidth * 0.32 },
        3: { cellWidth: tableWidth * 0.15, halign: 'right' },
        4: { cellWidth: tableWidth * 0.15 }
      }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || y;
    y = finalY + 4;
  }

  if (data.summaryRows?.length) {
    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Detalhes']],
      body: data.summaryRows.map(row => [row.label, row.value]),
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.2,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.35 },
        1: { cellWidth: tableWidth * 0.55 }
      }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || y;
    y = finalY + 4;
  }

  return y;
}

function renderOSSection(doc: jsPDF, data: ReceiptData, width: number, margin: number, y: number): number {
  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("DETALHES DA ORDEM:", margin, y);
  y += 4;

  const tableWidth = width - margin * 2;

  if (data.detailTable?.body?.length) {
    autoTable(doc, {
      startY: y,
      head: [data.detailTable.head],
      body: data.detailTable.body,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [62, 63, 147],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.2,
      columnStyles: data.detailTable.columnStyles || {
        0: { cellWidth: tableWidth * 0.18, halign: 'center' },
        1: { cellWidth: tableWidth * 0.2 },
        2: { cellWidth: tableWidth * 0.32 },
        3: { cellWidth: tableWidth * 0.15, halign: 'right' },
        4: { cellWidth: tableWidth * 0.15 }
      }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || y;
    y = finalY + 4;
  }

  if (data.summaryRows?.length) {
    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Detalhes']],
      body: data.summaryRows.map(row => [row.label, row.value]),
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.2,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.35 },
        1: { cellWidth: tableWidth * 0.55 }
      }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || y;
    y = finalY + 4;
  }

  return y;
}

function renderFooterSection(doc: jsPDF, config: ReceiptConfig, width: number, margin: number, y: number): number {
  const contentWidth = width - margin * 2;
  doc.setFontSize(7);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 7;

  if (config.mensagemAgradecimento?.trim()) {
    doc.setFontSize(8).setFont("helvetica", "bold");
    doc.text(config.mensagemAgradecimento.trim(), width/2, y, { align: "center" });
    y += 4;
  }

  if (config.instagramLoja) {
    doc.setFontSize(7).setFont("helvetica", "normal");
    doc.text(`Instagram: @${config.instagramLoja}`, width/2, y, { align: "center" });
    y += 4;
  }

  y += 3;

  if (config.politicaGarantia?.trim()) {
    doc.setFontSize(7);
    doc.text("POLÍTICA DE GARANTIA:", margin, y);
    y += 4;

    const warrantyLines = doc.splitTextToSize(config.politicaGarantia.trim(), contentWidth);
    warrantyLines.forEach(line => {
      doc.text(line.trim(), margin, y);
      y += 3;
    });
  }

  return y;
}

function renderStoreHeader(
  doc: jsPDF,
  config: ReceiptConfig,
  width: number,
  margin: number,
  startY: number,
  options: { nameFontSize?: number; infoFontSize?: number } = {}
): number {
  const { nameFontSize = 13, infoFontSize = 9 } = options;
  let y = startY;

  const storeName = (config.nomeLoja || 'HELP SMART').trim() || 'HELP SMART';
  const storePhone = config.telefoneLoja?.trim();
  const storeCNPJ = (config.cnpjLoja || '57.550.258/0001-89').trim();
  const storeInstagram = config.instagramLoja?.replace(/^@/, '').trim();
  const storeAddress = config.enderecoLoja?.trim();

  doc.setFontSize(nameFontSize).setFont('helvetica', 'bold');
  doc.text(storeName, width / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal').setFontSize(infoFontSize);

  if (storeCNPJ) {
    doc.text(`CNPJ: ${storeCNPJ}`, width / 2, y, { align: 'center' });
    y += 4;
  }

  if (storePhone) {
    doc.text(`Telefone: ${storePhone}`, width / 2, y, { align: 'center' });
    y += 4;
  }

  if (storeInstagram) {
    doc.text(`Instagram: @${storeInstagram}`, width / 2, y, { align: 'center' });
    y += 4;
  }

  if (storeAddress) {
    doc.setFontSize(Math.max(infoFontSize - 1, 7));
    const addressLines = doc.splitTextToSize(`Endereço: ${storeAddress}`, width - margin * 2);
    addressLines.forEach(line => {
      doc.text(line.trim(), width / 2, y, { align: 'center' });
      y += 3;
    });
    y += 1;
    doc.setFontSize(infoFontSize);
  }

  return y;
}

function openPDFWithFallback(doc: jsPDF, id: string, targetWindow?: Window | null): string {
  try {
    const pdfDataUri = doc.output('dataurlstring');

    // Try to open PDF in new window
    const newWindow = targetWindow ?? window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>Recibo ${id}</title></head>
          <body style="margin:0;">
            <iframe src="${pdfDataUri}" width="100%" height="100%" style="border:none;"></iframe>
          </body>
        </html>
      `);
      return pdfDataUri;
    } else {
      // Fallback: download PDF
      doc.save(`recibo_${id}.pdf`);
      return pdfDataUri;
    }
  } catch (error) {
    console.error('❌ Erro ao abrir PDF:', error);
    alert(`Erro ao abrir PDF: ${error.message}`);
    return '';
  }
}

// ===================
// Funções exportadas específicas
// ===================

export function generateTransactionReceipt(transaction: Transaction, config: ReceiptConfig): string {
  const itemsCount = transaction.items?.length ?? 0;
  const requiredHeight = Math.max(180, 150 + itemsCount * 12);
  
  const doc = new jsPDF({
    unit: "mm",
    format: [config.larguraBobina || 58, requiredHeight],
    orientation: 'portrait'
  });

  doc.setTextColor(0, 0, 0);
  const width = config.larguraBobina || 58;
  const margin = DEFAULT_MARGIN;
  const contentWidth = width - margin * 2;
  let y = 8;

  // HEADER
  y = renderStoreHeader(doc, config, width, margin, y, { nameFontSize: 13, infoFontSize: 9 });
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text("=".repeat(Math.floor(width/2)), width/2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text('LANÇAMENTO', width/2, y, { align: "center" });
  y += 4;
  doc.text(`#${transaction.id}`, width/2, y, { align: "center" });
  y += 4;

  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(`Data/Hora: ${format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}`, margin, y);
  y += 5;

  doc.setFontSize(7);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // CONTENT
  const paymentDetails = formatPaymentDetails(transaction.paymentMethod, transaction.paymentSplits);
  const hasItems = !!(transaction.items && transaction.items.length > 0);

  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("Tipo:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(transactionTypeLabels[transaction.type] || transaction.type.toUpperCase(), margin + 12, y);
  y += 4;

  if (hasItems) {
    doc.setFont("helvetica", "bold");
    doc.text("Itens:", margin, y);
    y += 4;

    const descriptionWidth = Math.max(contentWidth - 30, 20);

    autoTable(doc, {
      startY: y,
      head: [['Qtd', 'Descrição', 'Unitário', 'Total']],
      body: transaction.items!.map(item => [
        String(item.quantity),
        item.description,
        formatCurrency(item.unitPrice),
        formatCurrency(item.total),
      ]),
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        halign: 'left',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: descriptionWidth },
        2: { cellWidth: 12, halign: 'right' },
        3: { cellWidth: 12, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
      },
    });

    y = (doc.lastAutoTable?.finalY ?? y) + 4;

    doc.setFont("helvetica", "bold");
    doc.text("Resumo da venda:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`Itens: ${transaction.items!.length}`, margin + 2, y);
    y += 3;
    doc.text(`Quantidade total: ${transaction.quantity}`, margin + 2, y);
    y += 3;
    doc.text(`Valor médio: ${formatCurrency(transaction.unitPrice)}`, margin + 2, y);
    y += 4;
  } else {
    doc.setFont("helvetica", "bold");
    doc.text("Descrição:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(transaction.description, contentWidth);
    descLines.forEach(line => { doc.text(line.trim(), margin + 2, y); y += 3; });
    y += 2;

    doc.setFont("helvetica", "bold");
    doc.text("Quantidade:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${transaction.quantity}`, margin + 22, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Valor Unit.:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatCurrency(transaction.unitPrice), margin + 22, y);
    y += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Forma de Pagamento:", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  const paymentLines = paymentDetails.split('\n');
  paymentLines.forEach(line => { doc.text(line.trim(), margin + 2, y); y += 3; });
  y += 2;

  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(`Valor Total:   ${formatCurrency(transaction.total)}`, width/2, y, { align: "center" });
  y += 5;

  if (transaction.notes) {
    doc.setFontSize(7);
    doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
    y += 4;
    doc.setFontSize(8).setFont("helvetica", "bold");
    doc.text("Observações:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(transaction.notes, contentWidth);
    notesLines.forEach(line => { doc.text(line.trim(), margin + 2, y); y += 3; });
  }

  // FOOTER
  y = renderFooterSection(doc, config, width, margin, y);

  return openPDFWithFallback(doc, transaction.id);
}

export function generateServiceOrderReceipt(
  order: ServiceOrder,
  config: ReceiptConfig,
  viaType: 'cliente' | 'loja' = 'cliente',
  targetWindow?: Window | null
): string {
  const requiredHeight = 200;
  
  const doc = new jsPDF({
    unit: "mm",
    format: [config.larguraBobina || 58, requiredHeight],
    orientation: 'portrait'
  });

  doc.setTextColor(0, 0, 0);
  const width = config.larguraBobina || 58;
  const margin = DEFAULT_MARGIN;
  const contentWidth = width - margin * 2;
  let y = 8;

  // HEADER
  y = renderStoreHeader(doc, config, width, margin, y, { nameFontSize: 13, infoFontSize: 9 });
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text("=".repeat(Math.floor(width/2)), width/2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(`VIA ${viaType.toUpperCase()}`, width/2, y, { align: "center" });
  y += 5;

  doc.setFontSize(10);
  doc.text("Ordem de Serviço", width/2, y, { align: "center" });
  y += 4;

  doc.setFontSize(9);
  doc.text(`#${order.id}`, width/2, y, { align: "center" });
  y += 4;

  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(`${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}`, width/2, y, { align: "center" });
  y += 5;

  doc.setFontSize(7);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // DADOS DO CLIENTE
  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("Dados do Cliente", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${order.customerName || 'N/A'}`, margin, y);
  y += 4;
  doc.text(`Telefone: ${order.customerPhone || 'N/A'}`, margin, y);
  y += 5;

  doc.setFontSize(7);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // SERVIÇO
  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("Serviço", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.text("Descrição:", margin, y);
  y += 3;
  const descLines = doc.splitTextToSize(order.description || 'Não especificado', contentWidth);
  descLines.forEach(line => { doc.text(`  ${line.trim()}`, margin, y); y += 3; });
  y += 2;

  doc.text(`Status: ${statusLabels[order.status] || order.status.toUpperCase()}`, margin, y);
  y += 4;

  if (order.estimatedDeadline) {
    doc.text(`Previsão: ${format(new Date(order.estimatedDeadline), 'dd/MM/yyyy')}`, margin, y);
    y += 4;
  }

  doc.setFontSize(7);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // PAGAMENTO
  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("Pagamento", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  const paymentDetails = formatPaymentDetails(order.paymentMethod, order.paymentSplits);
  doc.text("Forma:", margin, y);
  y += 3;
  const paymentLines = paymentDetails.split('\n');
  paymentLines.forEach(line => { doc.text(`  ${line.trim()}`, margin, y); y += 3; });
  y += 2;

  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(`Valor Total:   ${formatCurrency(order.value)}`, width/2, y, { align: "center" });
  y += 5;

  if (order.notes) {
    doc.setFontSize(7);
    doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
    y += 4;
    doc.setFontSize(8).setFont("helvetica", "bold");
    doc.text("Observações:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(order.notes, contentWidth);
    notesLines.forEach(line => { doc.text(line.trim(), margin, y); y += 3; });
  }

  // FOOTER
  y = renderFooterSection(doc, config, width, margin, y);

  return openPDFWithFallback(doc, order.id, targetWindow);
}

export function generateCreditSalePaymentReceipt(
  payment: CreditSalePayment,
  sale: CreditSale,
  config: ReceiptConfig,
  viaType: 'cliente' | 'loja' = 'cliente',
): string {
  const requiredHeight = 220;

  const doc = new jsPDF({
    unit: 'mm',
    format: [config.larguraBobina || 58, requiredHeight],
    orientation: 'portrait',
  });

  doc.setTextColor(0, 0, 0);
  const width = config.larguraBobina || 58;
  const margin = DEFAULT_MARGIN;
  const contentWidth = width - margin * 2;
  let y = 8;

  const paymentIdentifier = payment.id ?? `${sale.id ?? 'crediario'}-${payment.paymentDate}`;
  const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
  const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;
  const dueDate = sale.chargeDate ? new Date(sale.chargeDate) : null;

  const currentAmountPaid = Number.isFinite(sale.amountPaid) ? sale.amountPaid : 0;
  const currentRemaining = Number.isFinite(sale.remainingAmount)
    ? sale.remainingAmount ?? 0
    : Math.max(sale.total - currentAmountPaid, 0);

  // HEADER
  y = renderStoreHeader(doc, config, width, margin, y, { nameFontSize: 13, infoFontSize: 9 });
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.text('='.repeat(Math.floor(width / 2)), width / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'bold').setFontSize(9);
  doc.text(`VIA ${viaType.toUpperCase()}`, width / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(10);
  doc.text('Recebimento Crediário', width / 2, y, { align: 'center' });
  y += 4;

  if (sale.id) {
    doc.setFontSize(9);
    doc.text(`#${sale.id}`, width / 2, y, { align: 'center' });
    y += 4;
  }

  doc.setFont('helvetica', 'normal').setFontSize(8);
  doc.text(`Pagamento em ${format(paymentDate, 'dd/MM/yyyy HH:mm')}`, width / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(7);
  doc.text('-'.repeat(Math.floor(width / 1.5)), margin, y);
  y += 4;

  // CLIENTE
  doc.setFontSize(8).setFont('helvetica', 'bold');
  doc.text('Dados do Cliente', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${sale.customerName || 'N/A'}`, margin, y);
  y += 4;

  if (sale.customerPhone) {
    doc.text(`Telefone: ${sale.customerPhone}`, margin, y);
    y += 4;
  }

  doc.setFontSize(7);
  doc.text('-'.repeat(Math.floor(width / 1.5)), margin, y);
  y += 4;

  // VENDA
  doc.setFontSize(8).setFont('helvetica', 'bold');
  doc.text('Resumo da Venda', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.text(`Descrição:`, margin, y);
  y += 3;
  const descriptionLines = doc.splitTextToSize(sale.description || 'Venda a prazo', contentWidth);
  descriptionLines.forEach((line) => {
    doc.text(`  ${line.trim()}`, margin, y);
    y += 3;
  });
  y += 1;

  if (sale.items && sale.items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Itens da venda:', margin, y);
    y += 3;
    doc.setFont('helvetica', 'normal');

    sale.items.forEach((item) => {
      const itemLine = `${item.quantity}x ${item.description} - ${formatCurrency(item.total)}`;
      const lines = doc.splitTextToSize(itemLine, contentWidth);
      lines.forEach((line) => {
        doc.text(`  ${line.trim()}`, margin, y);
        y += 3;
      });
    });

    y += 1;
  }

  if (saleDate) {
    doc.text(`Data da venda: ${format(saleDate, 'dd/MM/yyyy')}`, margin, y);
    y += 4;
  }

  if (dueDate) {
    doc.text(`Próx. vencimento: ${format(dueDate, 'dd/MM/yyyy')}`, margin, y);
    y += 4;
  }

  if (sale.installments > 0) {
    const installmentValue = sale.installmentValue ?? (sale.installments > 0 ? sale.total / sale.installments : 0);
    doc.text(
      `Parcelas: ${sale.installments}x de ${formatCurrency(Number.isFinite(installmentValue) ? installmentValue : 0)}`,
      margin,
      y,
    );
    y += 4;
  }

  doc.text(`Total da venda: ${formatCurrency(sale.total)}`, margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text(`Pago até o momento: ${formatCurrency(currentAmountPaid)}`, margin, y);
  y += 4;

  doc.text(`Restante após pagamento: ${formatCurrency(currentRemaining)}`, margin, y);
  y += 4;

  const saleStatusLabel = sale.status === 'paga' ? 'Paga' : 'Em aberto';
  doc.text(`Status: ${saleStatusLabel}`, margin, y);
  y += 5;

  doc.setFontSize(7);
  doc.text('-'.repeat(Math.floor(width / 1.5)), margin, y);
  y += 4;

  // PAGAMENTO
  doc.setFontSize(8).setFont('helvetica', 'bold');
  doc.text('Detalhes do Pagamento', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.text(`Recibo: ${paymentIdentifier}`, margin, y);
  y += 4;

  doc.text(`Valor pago: ${formatCurrency(payment.amount)}`, margin, y);
  y += 4;

  const paymentMethodLabel = paymentLabels[payment.paymentMethod] || payment.paymentMethod.toUpperCase();
  doc.text(`Forma: ${paymentMethodLabel}`, margin, y);
  y += 4;

  doc.text(`Registrado em: ${format(paymentDate, 'dd/MM/yyyy HH:mm')}`, margin, y);
  y += 4;

  if (payment.notes) {
    doc.text('Observações:', margin, y);
    y += 3;
    const notesLines = doc.splitTextToSize(payment.notes, contentWidth);
    notesLines.forEach((line) => {
      doc.text(`  ${line.trim()}`, margin, y);
      y += 3;
    });
    y += 1;
  }

  if (sale.notes) {
    doc.text('Observações da venda:', margin, y);
    y += 3;
    const saleNotesLines = doc.splitTextToSize(sale.notes, contentWidth);
    saleNotesLines.forEach((line) => {
      doc.text(`  ${line.trim()}`, margin, y);
      y += 3;
    });
    y += 1;
  }

  // FOOTER
  y = renderFooterSection(doc, config, width, margin, y);

  return openPDFWithFallback(doc, `crediario_${paymentIdentifier}`);
}

export function generateServiceOrderWarranty(order: ServiceOrder, config: ReceiptConfig): string {
  const requiredHeight = 250;
  
  const doc = new jsPDF({
    unit: "mm",
    format: [config.larguraBobina || 58, requiredHeight],
    orientation: 'portrait'
  });

  doc.setTextColor(0, 0, 0);
  const width = config.larguraBobina || 58;
  const margin = DEFAULT_MARGIN;
  const contentWidth = width - margin * 2;
  let y = 8;

  // HEADER
  y = renderStoreHeader(doc, config, width, margin, y, { nameFontSize: 12, infoFontSize: 8 });
  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text("=".repeat(Math.floor(width/2)), width/2, y, { align: "center" });
  y += 5;
  
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("TERMO DE GARANTIA", width/2, y, { align: "center" });
  y += 5;
  
  doc.setFontSize(8);
  doc.text(`OS #${order.id}`, width/2, y, { align: "center" });
  y += 4;
  
  doc.setFont("helvetica", "normal").setFontSize(7);
  doc.text(`Data: ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}`, margin, y);
  y += 5;
  
  doc.setFontSize(6);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // DADOS DA OS
  doc.setFontSize(7).setFont("helvetica", "bold");
  doc.text("Dados da OS", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.text(`Número: ${order.id}`, margin, y);
  y += 4;
  doc.text(`Data: ${format(new Date(order.createdAt), 'dd/MM/yyyy')}`, margin, y);
  y += 4;
  doc.text(`Status: ${statusLabels[order.status] || order.status.toUpperCase()}`, margin, y);
  y += 4;
  doc.text(`Valor: ${formatCurrency(order.value)}`, margin, y);
  y += 4;
  
  const paymentDetails = formatPaymentDetails(order.paymentMethod, order.paymentSplits);
  doc.text("Pagamento:", margin, y);
  y += 3;
  const paymentLines = paymentDetails.split('\n');
  paymentLines.forEach(line => { doc.text(`  ${line.trim()}`, margin, y); y += 3; });
  y += 2;

  doc.setFontSize(6);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // DADOS DO CLIENTE
  doc.setFontSize(7).setFont("helvetica", "bold");
  doc.text("Dados do Cliente", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${order.customerName || 'N/A'}`, margin, y);
  y += 4;
  doc.text(`Telefone: ${order.customerPhone || 'N/A'}`, margin, y);
  y += 4;

  if (order.notes) {
    doc.text("Observações:", margin, y);
    y += 3;
    const notesLines = doc.splitTextToSize(order.notes, contentWidth);
    notesLines.forEach(line => { doc.text(`  ${line.trim()}`, margin, y); y += 3; });
    y += 2;
  }

  doc.setFontSize(6);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // PRAZOS E GARANTIA
  doc.setFontSize(7).setFont("helvetica", "bold");
  doc.text("Prazos e Garantia", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  const estimatedDeadline = order.estimatedDeadline
    ? format(new Date(order.estimatedDeadline), 'dd/MM/yyyy')
    : 'Não informado';
  doc.text(`Previsão: ${estimatedDeadline}`, margin, y);
  y += 4;

  const warrantyDate = new Date(order.createdAt);
  warrantyDate.setDate(warrantyDate.getDate() + 90);
  doc.text(`Garantia até: ${format(warrantyDate, 'dd/MM/yyyy')}`, margin, y);
  y += 5;

  doc.setFontSize(6);
  doc.text("Termos da garantia:", margin, y);
  y += 3;
  doc.text("- Garantia de 90 dias para serviço", margin, y);
  y += 3;
  doc.text("  (exceto mau uso)", margin, y);
  y += 3;
  doc.text("- Garantia de 30 dias para produtos", margin, y);
  y += 3;
  doc.text("  (exceto mau uso)", margin, y);
  y += 4;

  if (config.politicaGarantia?.trim()) {
    const warrantyLines = doc.splitTextToSize(config.politicaGarantia.trim(), contentWidth);
    warrantyLines.forEach(line => { doc.text(line.trim(), margin, y); y += 3; });
    y += 2;
  }

  doc.setFontSize(6);
  doc.text("-".repeat(Math.floor(width/1.5)), margin, y);
  y += 4;

  // ASSINATURAS
  doc.setFontSize(7).setFont("helvetica", "bold");
  doc.text("Assinaturas (ciência)", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal").setFontSize(6);
  doc.text("Cliente:", margin, y);
  y += 3;
  doc.text("_______________________________", margin, y);
  y += 6;

  doc.text("Loja:", margin, y);
  y += 3;
  doc.text("_______________________________", margin, y);
  y += 5;

  // FOOTER
  y = renderFooterSection(doc, config, width, margin, y);

  return openPDFWithFallback(doc, `garantia_${order.id}`);
}

