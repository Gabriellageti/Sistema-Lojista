import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { useTransactions } from '@/hooks/useTransactions';
import { useCashSessions } from '@/hooks/useCashSessions';
import { ServiceOrder, ServiceOrderInput, OrderStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  buildServiceOrderTransactionPayload,
  ServiceOrderTransactionExtras,
} from '@/utils/serviceOrderTransactions';
import { generateServiceOrderReceipt, generateServiceOrderWarranty } from '@/services/PDFService';
import OSStats from '@/components/orders/OSStats';
import OSListView from '@/components/orders/OSListView';
import ServiceOrderForm from '@/components/orders/ServiceOrderForm';
import OSExport from '@/components/orders/OSExport';

const Orders = () => {
  const { orders, loading, saveServiceOrder, deleteServiceOrder } = useServiceOrders();
  const { config: receiptConfig } = useReceiptConfig();
  const { saveTransaction } = useTransactions();
  const { currentSession } = useCashSessions();
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('aberta');
  const { toast } = useToast();

  useEffect(() => {
    // Check URL params for auto-opening form
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setShowForm(true);
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Listen for custom event from floating actions
    const handleOpenForm = () => setShowForm(true);
    window.addEventListener('openOrderForm', handleOpenForm);
    
    return () => {
      window.removeEventListener('openOrderForm', handleOpenForm);
    };
  }, []);

  const filterOrders = useCallback(() => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const handleSaveOrder = async (
    order: ServiceOrderInput,
    extras?: ServiceOrderTransactionExtras,
  ) => {
    const isCompleted = order.status === 'concluida';

    const savedOrder = await saveServiceOrder(order);

    if (!savedOrder) {
      if (isCompleted) {
        toast({
          title: 'Lançamento não gerado',
          description: 'Não foi possível salvar a OS para registrar o lançamento.',
          variant: 'destructive',
        });
      }
      return;
    }

    if (isCompleted) {
      if (!currentSession?.id) {
        toast({
          title: 'Sessão de caixa não encontrada',
          description: 'Abra uma sessão de caixa para registrar o lançamento da OS concluída.',
          variant: 'destructive',
        });
      } else {
        const fallbackPayload = buildServiceOrderTransactionPayload(savedOrder);
        const extrasPayload = extras?.transactionPayload;
        const payload = {
          ...fallbackPayload,
          ...(extrasPayload ?? {}),
          description: fallbackPayload.description,
          notes: fallbackPayload.notes ?? extrasPayload?.notes,
          createdAt: extrasPayload?.createdAt ?? fallbackPayload.createdAt,
        };

        const result = await saveTransaction({
          ...payload,
          sessionId: currentSession.id,
        });

        if (!result) {
          toast({
            title: 'Lançamento não gerado',
            description: 'Não foi possível registrar a transação da OS concluída.',
            variant: 'destructive',
          });
        }
      }
    }

    setShowForm(false);
    setEditingOrder(null);
    toast({
      title: editingOrder ? 'OS atualizada' : 'OS criada',
      description: `${order.customerName} - R$ ${order.value.toFixed(2)}`,
    });
  };

  const handleEditOrder = (order: ServiceOrder) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleDeleteOrder = async (id: string) => {
    await deleteServiceOrder(id);

    toast({
      title: 'OS movida para a lixeira',
      description: 'Você pode restaurar ou remover definitivamente esta OS pela lixeira.',
    });
  };

  const handleStatusChange = (id: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      const updatedOrder = { ...order, status, updatedAt: new Date().toISOString() };
      handleSaveOrder(updatedOrder);
    }
  };

  const handlePrint = (order: ServiceOrder, viaType: 'cliente' | 'loja') => {
    console.log('📋 Iniciando impressão de ordem de serviço...');
    console.log('🎯 OS para impressão:', JSON.stringify(order, null, 2));
    console.log('⚙️ Config obtida:', JSON.stringify(receiptConfig, null, 2));
    console.log('📝 Tipo de via:', viaType);
    
    const result = generateServiceOrderReceipt(order, receiptConfig, viaType);
    console.log('📄 Resultado da impressão:', result);
  };

  const handlePrintWarranty = (order: ServiceOrder) => {
    console.log('📜 Iniciando impressão de garantia...');
    console.log('🎯 OS para garantia:', JSON.stringify(order, null, 2));
    
    const result = generateServiceOrderWarranty(order, receiptConfig);
    console.log('📜 Resultado da impressão da garantia:', result);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Ordens de serviço abertas</p>
        </div>
        <div className="flex gap-2">
          <OSExport orders={filteredOrders} isFiltered={searchTerm !== ''} />
          <Button onClick={() => setShowForm(true)} variant="hero" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Nova OS
          </Button>
        </div>
      </div>

      <OSStats
        orders={orders}
        onStatusClick={setStatusFilter}
        selectedStatus={statusFilter}
      />

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por cliente, telefone, descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <OSListView
        orders={filteredOrders}
        onEdit={handleEditOrder}
        onDelete={handleDeleteOrder}
        onPrint={handlePrint}
        onPrintWarranty={handlePrintWarranty}
        onStatusChange={handleStatusChange}
      />

      {showForm && (
        <ServiceOrderForm
          order={editingOrder}
          onSave={handleSaveOrder}
          onCancel={() => {
            setShowForm(false);
            setEditingOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default Orders;