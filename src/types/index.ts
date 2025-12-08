// Sistema Lojista - Type Definitions

export interface CashSession {
  id?: string;
  date: string; // YYYY-MM-DD
  initialAmount: number;
  isOpen: boolean;
  isClosed?: boolean;
  openedAt: string;
  closedAt?: string;
  totalSales: number;
  totalEntries: number;
  totalExits: number;
  totalExpenses: number;
  finalAmount?: number;
  salesCount?: number;
  averageTicket?: number;
  deletedAt?: string;
}

export interface PaymentSplit {
  method: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'outros';
  amount: number;
}

export interface TransactionItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type CreditSaleItem = TransactionItem;

export interface Transaction {
  id?: string;
  sessionId: string;
  type: 'entrada' | 'saida' | 'venda' | 'despesa';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'outros';
  paymentSplits?: PaymentSplit[]; // Multiple payment methods
  items?: TransactionItem[];
  notes?: string;
  creditSaleId?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export type TransactionInput = Omit<Transaction, 'createdAt'> & {
  createdAt?: string;
};

export interface CreditSaleReminderPreferences {
  enabled: boolean;
  daysBefore: number;
  remindAt?: string | null;
}

export type CreditSaleStatus = 'em_aberto' | 'paga';

export interface CreditSale {
  id?: string;
  customerName: string;
  customerPhone?: string | null;
  description: string;
  items?: CreditSaleItem[];
  total: number;
  installments: number;
  installmentValue?: number | null;
  amountPaid: number;
  remainingAmount?: number | null;
  saleDate: string;
  chargeDate: string;
  status: CreditSaleStatus;
  reminderPreferences?: CreditSaleReminderPreferences | null;
  notes?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type CreditSaleInput = Omit<CreditSale, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export interface ServiceOrder {
  id?: string;
  customerName: string;
  customerPhone: string;
  description: string;
  value: number;
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'outros';
  paymentSplits?: PaymentSplit[]; // Multiple payment methods
  status: 'aberta' | 'concluida' | 'cancelada';
  notes?: string;
  estimatedDeadline?: string;
  photos?: string[]; // Array of base64 encoded images
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type ServiceOrderInput = Omit<ServiceOrder, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  paperWidth: 58 | 80 | 85; // mm
  currency: string;
  theme: 'light' | 'dark';
  autoSuggestion: boolean;
}

export interface ReceiptConfig {
  nomeLoja: string;
  telefoneLoja: string;
  cnpjLoja: string;
  instagramLoja: string;
  enderecoLoja: string;
  mensagemAgradecimento: string;
  politicaGarantia: string;
  larguraBobina: 58 | 80 | 85;
}

export interface Report {
  period: {
    start: string;
    end: string;
  };
  totalSales: number;
  totalEntries: number;
  totalExits: number;
  totalExpenses: number;
  averageTicket: number;
  salesCount: number;
  paymentMethods: Record<string, number>;
  topDescriptions: Array<{ description: string; count: number; total: number }>;
  completedOrders: number;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'outros';
export type TransactionType = 'entrada' | 'saida' | 'venda' | 'despesa';
export type OrderStatus = 'aberta' | 'concluida' | 'cancelada';

export interface CreditSalePostponeInput {
  chargeDate: string;
  reminderPreferences?: CreditSaleReminderPreferences | null;
  notes?: string | null;
}

export interface CreditSalePayment {
  id?: string;
  creditSaleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  sessionId?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreditSalePaymentInput = Omit<CreditSalePayment, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}
