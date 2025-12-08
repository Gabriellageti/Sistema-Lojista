import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, ServiceOrderInput } from '@/types';
import { useToast } from '@/hooks/use-toast';

const normalizeTimestamp = (value?: string) => {
  if (!value) return undefined;

  const normalizedInput = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalizedInput);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

export const useServiceOrders = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const mapOrder = (order: any): ServiceOrder => ({
    id: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    description: order.description,
    value: Number(order.value),
    paymentMethod: order.payment_method,
    paymentSplits: order.payment_splits as any,
    status: order.status,
    notes: order.notes || undefined,
    photos: order.photos || undefined,
    estimatedDeadline: order.estimated_deadline || undefined,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    deletedAt: order.deleted_at ?? undefined,
  });

  // Load all service orders
  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data.map(mapOrder));
    } catch (error) {
      console.error('Error loading service orders:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens de serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save or update service order
  const saveServiceOrder = async (order: ServiceOrderInput): Promise<ServiceOrder | null> => {
    try {
      const orderData: Record<string, any> = {
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        description: order.description,
        value: order.value,
        payment_method: order.paymentMethod,
        payment_splits: order.paymentSplits ? JSON.parse(JSON.stringify(order.paymentSplits)) : null,
        status: order.status,
        notes: order.notes || null,
        photos: order.photos || null,
        estimated_deadline: order.estimatedDeadline || null,
        deleted_at: order.deletedAt ?? null,
      };

      if (order.id) {
        orderData.id = order.id;
      }

      const createdAt = normalizeTimestamp(order.createdAt);
      if (createdAt) {
        orderData.created_at = createdAt;
      }

      const updatedAt = normalizeTimestamp(order.updatedAt);
      if (updatedAt) {
        orderData.updated_at = updatedAt;
      }

      const { data, error } = order.id 
        ? await supabase
            .from('service_orders')
            .update(orderData)
            .eq('id', order.id)
            .select()
            .single()
        : await supabase
            .from('service_orders')
            .insert([orderData] as any)
            .select()
            .single();

      if (error) throw error;

      await loadOrders();

      return data ? mapOrder(data) : null;
    } catch (error) {
      console.error('Error saving service order:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar ordem de serviço",
        variant: "destructive",
      });
      return null;
    }
  };

  // Delete service order
  const deleteServiceOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await loadOrders();
    } catch (error) {
      console.error('Error deleting service order:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar ordem de serviço para a lixeira",
        variant: "destructive",
      });
    }
  };

  const restoreServiceOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;

      await loadOrders();
    } catch (error) {
      console.error('Error restoring service order:', error);
      toast({
        title: "Erro",
        description: "Erro ao restaurar ordem de serviço",
        variant: "destructive",
      });
    }
  };

  const purgeServiceOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadOrders();
    } catch (error) {
      console.error('Error purging service order:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover definitivamente a ordem de serviço",
        variant: "destructive",
      });
    }
  };

  // Get all service orders
  const getServiceOrders = () => orders;

  useEffect(() => {
    loadOrders();
  }, []);

  return {
    orders,
    loading,
    saveServiceOrder,
    deleteServiceOrder,
    getServiceOrders,
    restoreServiceOrder,
    purgeServiceOrder,
    reload: loadOrders,
  };
};

