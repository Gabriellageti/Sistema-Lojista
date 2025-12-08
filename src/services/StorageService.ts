// Storage Service with Demo Data

import { CashSession, Transaction, TransactionInput, ServiceOrder, ServiceOrderInput, StoreSettings, ReceiptConfig } from '@/types';
import { format, subDays, addHours } from 'date-fns';
import { defaultReceiptConfig, defaultStoreSettings, storagePrefix } from '@/config/defaults';

interface StorageProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

class LocalStorageProvider implements StorageProvider {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

export class StorageService {
  private static instance: StorageService;
  private provider: StorageProvider;

  private constructor() {
    this.provider = new LocalStorageProvider();
    this.initializeDemoData();
  }

  private getKey(name: string): string {
    return `${storagePrefix}_${name}`;
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initializeDemoData(): void {
    // App starts with no data - demo data removed
  }

  private loadDemoData(): void {
    const today = new Date();
    // Fix timezone issue by getting local date string
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    // Demo cash session (today)
    const demoSession: CashSession = {
      id: 'session-demo-today',
      date: todayStr,
      initialAmount: 100,
      isOpen: true,
      openedAt: today.toISOString(),
      totalSales: 0,
      totalEntries: 0,
      totalExits: 0,
      totalExpenses: 0
    };

    // Demo transactions (last 7 days)
    const demoTransactions: Transaction[] = [];
    
    // Generate demo transactions for last 7 days
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const sessionId = i === 0 ? demoSession.id : `session-demo-${dateStr}`;
      
      // 2-3 transactions per day
      const transactionCount = Math.floor(Math.random() * 2) + 2;
      
      for (let j = 0; j < transactionCount; j++) {
        const transactionTime = addHours(date, 9 + j * 3);
        
        const products = [
          'Acessório de celular', 'Carregador USB-C', 'Película de proteção',
          'Fone Bluetooth', 'Cabo Lightning', 'Película Hydrogel',
          'Capa silicone', 'Carregador veicular',
          'Suporte para celular', 'Cabo USB-C'
        ];
        
        const types: Array<'venda' | 'entrada' | 'saida' | 'despesa'> = ['venda', 'venda', 'venda', 'entrada', 'despesa'];
        const paymentMethods = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'] as const;
        
        const type = types[Math.floor(Math.random() * types.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = Math.floor(Math.random() * 50) + 10;
        
        demoTransactions.push({
          id: `trans-${dateStr}-${j}`,
          sessionId,
          type,
          description: product,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          notes: Math.random() > 0.7 ? 'Observação de exemplo' : undefined,
          createdAt: transactionTime.toISOString()
        });
      }
    }

    // Demo service orders
    const demoOrders: ServiceOrder[] = [
      {
        id: 'os-001',
        customerName: 'Cliente 1',
        customerPhone: '(00) 00000-0000',
        description: 'Troca de tela',
        value: 280,
        paymentMethod: 'pix',
        status: 'concluida',
        notes: 'Cliente satisfeito com o serviço',
        createdAt: subDays(today, 2).toISOString(),
        updatedAt: subDays(today, 1).toISOString()
      },
      {
        id: 'os-002',
        customerName: 'Cliente 2',
        customerPhone: '(00) 00000-0000',
        description: 'Reparo de carregamento',
        value: 120,
        paymentMethod: 'dinheiro',
        status: 'aberta',
        createdAt: subDays(today, 1).toISOString(),
        updatedAt: subDays(today, 1).toISOString()
      },
      {
        id: 'os-003',
        customerName: 'Cliente 3',
        customerPhone: '(00) 00000-0000',
        description: 'Formatação de notebook',
        value: 80,
        paymentMethod: 'cartao_debito',
        status: 'concluida',
        createdAt: subDays(today, 3).toISOString(),
        updatedAt: subDays(today, 2).toISOString()
      },
      {
        id: 'os-004',
        customerName: 'Cliente 4',
        customerPhone: '(00) 00000-0000',
        description: 'Limpeza interna de console',
        value: 60,
        paymentMethod: 'pix',
        status: 'cancelada',
        createdAt: subDays(today, 4).toISOString(),
        updatedAt: subDays(today, 3).toISOString()
      },
      {
        id: 'os-005',
        customerName: 'Cliente 5',
        customerPhone: '(00) 00000-0000',
        description: 'Instalação de película',
        value: 45,
        paymentMethod: 'cartao_credito',
        status: 'concluida',
        createdAt: subDays(today, 5).toISOString(),
        updatedAt: subDays(today, 4).toISOString()
      }
    ];

    // Demo store settings
    const demoSettings: StoreSettings = {
      ...defaultStoreSettings,
      storeName: defaultStoreSettings.storeName || 'Sua loja',
      storePhone: defaultStoreSettings.storePhone || '',
    };

    // Demo receipt config
    const demoReceiptConfig: ReceiptConfig = {
      ...defaultReceiptConfig,
      nomeLoja: defaultReceiptConfig.nomeLoja || demoSettings.storeName,
      telefoneLoja: defaultReceiptConfig.telefoneLoja || demoSettings.storePhone,
    };

    // Save demo data
    this.provider.set(this.getKey('sessions'), [demoSession]);
    this.provider.set(this.getKey('transactions'), demoTransactions);
    this.provider.set(this.getKey('orders'), demoOrders);
    this.provider.set(this.getKey('settings'), demoSettings);
    this.provider.set(this.getKey('receipt_config'), demoReceiptConfig);
  }

  // Cash Sessions
  getCashSessions(): CashSession[] {
    return this.provider.get<CashSession[]>(this.getKey('sessions')) || [];
  }

  saveCashSession(session: CashSession): void {
    const sessions = this.getCashSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    this.provider.set(this.getKey('sessions'), sessions);
  }

  getCurrentSession(): CashSession | null {
    const sessions = this.getCashSessions();
    return sessions.find(s => s.isOpen && !s.isClosed) || null;
  }

  // Transactions
  getTransactions(): Transaction[] {
    return this.provider.get<Transaction[]>(this.getKey('transactions')) || [];
  }

  saveTransaction(transaction: TransactionInput): void {
    const transactions = this.getTransactions();
    const normalized: Transaction = {
      ...transaction,
      createdAt: transaction.createdAt || new Date().toISOString(),
    };

    const index = transactions.findIndex(t => t.id === normalized.id);

    if (index >= 0) {
      transactions[index] = normalized;
    } else {
      transactions.push(normalized);
    }

    this.provider.set(this.getKey('transactions'), transactions);
  }

  deleteTransaction(id: string): void {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    this.provider.set(this.getKey('transactions'), filtered);
  }

  // Service Orders
  getServiceOrders(): ServiceOrder[] {
    return this.provider.get<ServiceOrder[]>(this.getKey('orders')) || [];
  }

  saveServiceOrder(order: ServiceOrderInput): void {
    const orders = this.getServiceOrders();
    const normalized: ServiceOrder = {
      ...order,
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || new Date().toISOString(),
    };

    const index = orders.findIndex(o => o.id === normalized.id);

    if (index >= 0) {
      orders[index] = normalized;
    } else {
      orders.push(normalized);
    }

    this.provider.set(this.getKey('orders'), orders);
  }

  deleteServiceOrder(id: string): void {
    const orders = this.getServiceOrders();
    const filtered = orders.filter(o => o.id !== id);
    this.provider.set(this.getKey('orders'), filtered);
  }

  // Settings
  getSettings(): StoreSettings {
    return this.provider.get<StoreSettings>(this.getKey('settings')) || defaultStoreSettings;
  }

  saveSettings(settings: StoreSettings): void {
    this.provider.set(this.getKey('settings'), settings);
  }

  // Receipt Config
  getReceiptConfig(): ReceiptConfig {
    return this.provider.get<ReceiptConfig>(this.getKey('receipt_config')) || defaultReceiptConfig;
  }

  saveReceiptConfig(config: ReceiptConfig): void {
    this.provider.set(this.getKey('receipt_config'), config);
  }

  // Clear all data
  clearAllData(): void {
    this.provider.clear();
  }
}

export const storageService = StorageService.getInstance();