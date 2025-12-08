// Sistema Lojista - Service Order Form Component

import { useState, useEffect } from 'react';
import { X, Wrench, Phone, User, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ServiceOrder, ServiceOrderInput, PaymentMethod, OrderStatus } from '@/types';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { generateServiceOrderReceipt } from '@/services/PDFService';
import {
  buildServiceOrderTransactionPayload,
  ServiceOrderTransactionExtras,
} from '@/utils/serviceOrderTransactions';

interface ServiceOrderFormProps {
  order?: ServiceOrder | null;
  onSave: (order: ServiceOrderInput, extras?: ServiceOrderTransactionExtras) => Promise<void> | void;
  onCancel: () => void;
}

const ServiceOrderForm = ({ order, onSave, onCancel }: ServiceOrderFormProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    description: '',
    value: 0,
    paymentMethod: 'dinheiro' as PaymentMethod,
    status: 'aberta' as OrderStatus,
    notes: '',
  });

  const { config } = useReceiptConfig();

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        description: order.description,
        value: order.value,
        paymentMethod: order.paymentMethod,
        status: order.status,
        notes: order.notes || '',
      });
    }
  }, [order]);

  const handleSubmitAndPrintBoth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      alert('Nome do cliente é obrigatório.');
      return;
    }

    if (!formData.description.trim()) {
      alert('Descrição do serviço é obrigatória.');
      return;
    }

    const now = new Date().toISOString();
    const clientGeneratedId =
      order?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
        : undefined);

    const newOrder: ServiceOrderInput = {
      ...(order?.id ? { id: order.id } : {}),
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim(),
      description: formData.description.trim(),
      value: formData.value,
      paymentMethod: formData.paymentMethod,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      createdAt: order?.createdAt || now,
      updatedAt: now,
    };

    const transactionPayload =
      newOrder.status === 'concluida'
        ? buildServiceOrderTransactionPayload(newOrder, {
            fallbackId: clientGeneratedId,
            createdAt: now,
          })
        : undefined;

    const clienteWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    const lojaWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;

    try {
      await onSave(newOrder, { transactionPayload });

      const printableOrder: ServiceOrder = {
        ...newOrder,
        id: newOrder.id ?? clientGeneratedId,
        createdAt: newOrder.createdAt || now,
        updatedAt: newOrder.updatedAt || now,
      };

      printServiceOrder(printableOrder, 'cliente', clienteWindow);
      printServiceOrder(printableOrder, 'loja', lojaWindow);
    } catch (error) {
      clienteWindow?.close();
      lojaWindow?.close();
      throw error;
    }
  };

  const printServiceOrder = (orderData: ServiceOrder, viaType: 'cliente' | 'loja', targetWindow?: Window | null) => {
    generateServiceOrderReceipt(orderData, config, viaType, targetWindow);
  };

  const handleSubmit = async (
    e: React.FormEvent,
    shouldPrint = false,
    viaType: 'cliente' | 'loja' = 'cliente'
  ) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      alert('Nome do cliente é obrigatório.');
      return;
    }

    if (!formData.description.trim()) {
      alert('Descrição do serviço é obrigatória.');
      return;
    }

    const now = new Date().toISOString();
    const clientGeneratedId =
      order?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
        : undefined);

    const newOrder: ServiceOrderInput = {
      ...(order?.id ? { id: order.id } : {}),
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim(),
      description: formData.description.trim(),
      value: formData.value,
      paymentMethod: formData.paymentMethod,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      createdAt: order?.createdAt || now,
      updatedAt: now,
    };

    const transactionPayload =
      newOrder.status === 'concluida'
        ? buildServiceOrderTransactionPayload(newOrder, {
            fallbackId: clientGeneratedId,
            createdAt: now,
          })
        : undefined;

    const preOpenedWindow = shouldPrint && typeof window !== 'undefined' ? window.open('', '_blank') : null;

    try {
      await onSave(newOrder, { transactionPayload });

      if (shouldPrint) {
        const printableOrder: ServiceOrder = {
          ...newOrder,
          id: newOrder.id ?? clientGeneratedId,
          createdAt: newOrder.createdAt || now,
          updatedAt: newOrder.updatedAt || now,
        };

        printServiceOrder(printableOrder, viaType, preOpenedWindow);
      }
    } catch (error) {
      preOpenedWindow?.close();
      throw error;
    }
  };

  const formatPhone = (phone: string) => {
    // Remove non-numeric characters
    const numeric = phone.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (numeric.length <= 10) {
      return numeric.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numeric.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, customerPhone: formatted }));
  };

  const statusLabels = {
    aberta: 'Aberta',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };

  const paymentLabels = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_debito: 'Cartão Débito',
    cartao_credito: 'Cartão Crédito',
    outros: 'Outros',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {order ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          >
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados do Cliente
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Nome do Cliente</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="customerPhone">Telefone</Label>
                    {formData.customerPhone && (
                      <a
                        href={`https://wa.me/55${formData.customerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Abrir WhatsApp
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Service Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Serviço</h3>
              
              <div>
                <Label htmlFor="description">Descrição do Serviço</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o serviço a ser realizado..."
                  rows={3}
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    style={{ textAlign: 'left', direction: 'ltr' }}
                    className="text-left"
                    onFocus={(e) => e.target.setSelectionRange(0, 0)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <select
                    id="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    {Object.entries(paymentLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Status (only show when editing) */}
            {order && (
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as OrderStatus }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-2"
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            )}


            {/* Notes */}
            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais sobre o serviço..."
                rows={3}
              />
            </div>

            {/* Value Display */}
            <div className="p-4 bg-primary/5 rounded-lg">
              <Label className="text-sm text-muted-foreground">Valor Total</Label>
              <p className="text-2xl font-bold text-primary">R$ {formData.value.toFixed(2)}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                onClick={(e) => handleSubmitAndPrintBoth(e)} 
                className="flex-1"
                title="Salvar e Imprimir Ambas as Vias"
              >
                <Printer className="w-4 h-4 mr-1" />
                {order ? 'Atualizar' : 'Gerar e Imprimir'}
              </Button>
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, true, 'cliente')}
                variant="secondary"
                className="flex-1"
                title="Salvar e Imprimir Via do Cliente"
              >
                <Printer className="w-4 h-4 mr-1" />
                Via Cliente
              </Button>
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, true, 'loja')}
                variant="outline"
                className="flex-1"
                title="Salvar e Imprimir Via da Empresa"
              >
                <Printer className="w-4 h-4 mr-1" />
                Minha Via
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceOrderForm;