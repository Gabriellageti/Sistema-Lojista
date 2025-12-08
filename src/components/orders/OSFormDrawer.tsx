import { useState, useEffect } from 'react';
import { X, Save, Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { ServiceOrder, ServiceOrderInput, OrderStatus, PaymentMethod } from '@/types';
import { useCashSessions } from '@/hooks/useCashSessions';
import { useTransactions } from '@/hooks/useTransactions';
import { buildServiceOrderTransactionPayload } from '@/utils/serviceOrderTransactions';
import { useToast } from '@/hooks/use-toast';

interface OSFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order?: ServiceOrder | null;
  onSave: (order: ServiceOrderInput) => void;
  onPrint?: (order: ServiceOrder) => void;
}

interface FormData {
  customerName: string;
  customerPhone: string;
  description: string;
  value: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  notes: string;
  photos: string[];
}

const paymentOptions = [
  { value: 'dinheiro' as const, label: 'Dinheiro' },
  { value: 'pix' as const, label: 'PIX' },
  { value: 'cartao_debito' as const, label: 'Cartão Débito' },
  { value: 'cartao_credito' as const, label: 'Cartão Crédito' },
  { value: 'outros' as const, label: 'Outros' }
];

const statusOptions = [
  { value: 'aberta' as const, label: 'Em Andamento' },
  { value: 'concluida' as const, label: 'Concluída' },
  { value: 'cancelada' as const, label: 'Cancelada' }
];

export default function OSFormDrawer({ isOpen, onClose, order, onSave, onPrint }: OSFormDrawerProps) {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerPhone: '',
    description: '',
    value: '',
    paymentMethod: 'dinheiro',
    status: 'aberta',
    notes: '',
    photos: []
  });
  
  const [generateTransaction, setGenerateTransaction] = useState(false);
  const [completeAndPrint, setCompleteAndPrint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentSession } = useCashSessions();
  const { saveTransaction, reload: reloadTransactions } = useTransactions();
  const { toast } = useToast();

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        description: order.description,
        value: order.value.toString(),
        paymentMethod: order.paymentMethod,
        status: order.status,
        notes: order.notes || '',
        photos: order.photos || []
      });
    } else {
      // Reset form for new OS
      setFormData({
        customerName: '',
        customerPhone: '',
        description: '',
        value: '',
        paymentMethod: 'dinheiro',
        status: 'aberta',
        notes: '',
        photos: []
      });
      setGenerateTransaction(false);
      setCompleteAndPrint(false);
    }
  }, [order, isOpen]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({ ...prev, customerPhone: formatPhone(value) }));
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseFloat(numbers) / 100;
    return amount.toFixed(2);
  };

  const handleValueChange = (value: string) => {
    const formatted = formatCurrency(value);
    setFormData(prev => ({ ...prev, value: formatted }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, base64]
          }));
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Reset input
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.customerName.trim()) errors.push('Nome do cliente é obrigatório');
    if (!formData.customerPhone.trim()) errors.push('Telefone é obrigatório');
    if (!formData.description.trim()) errors.push('Descrição do serviço é obrigatória');
    if (!formData.value || parseFloat(formData.value) <= 0) errors.push('Valor deve ser maior que zero');
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Erro no formulário:\n' + errors.join('\n'));
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const orderData: ServiceOrderInput = {
        id: order?.id || `os-${Date.now()}`,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        description: formData.description.trim(),
        value: parseFloat(formData.value),
        paymentMethod: formData.paymentMethod,
        status: completeAndPrint ? 'concluida' : formData.status,
        notes: formData.notes.trim() || undefined,
        photos: formData.photos.length > 0 ? formData.photos : undefined,
        createdAt: order?.createdAt || now,
        updatedAt: now
      };

      if (generateTransaction) {
        if (orderData.status !== 'concluida') {
          toast({
            title: 'Lançamento não gerado',
            description: 'Conclua a OS antes de gerar o lançamento no caixa.',
            variant: 'destructive',
          });
        } else if (!currentSession?.id) {
          toast({
            title: 'Sessão de caixa não encontrada',
            description: 'Abra uma sessão de caixa para registrar o lançamento da OS.',
            variant: 'destructive',
          });
        } else {
          const transactionPayload = buildServiceOrderTransactionPayload(orderData, {
            createdAt: now,
          });

          const savedTransaction = await saveTransaction({
            ...transactionPayload,
            sessionId: currentSession.id,
          });

          if (!savedTransaction) {
            toast({
              title: 'Lançamento não gerado',
              description: 'Não foi possível registrar o lançamento da OS.',
              variant: 'destructive',
            });
          } else {
            await reloadTransactions();
          }
        }
      }

      await onSave(orderData);

      // Print if requested
      if (completeAndPrint && onPrint) {
        const printableOrder: ServiceOrder = {
          ...orderData,
          createdAt: orderData.createdAt || now,
          updatedAt: orderData.updatedAt || now,
        };
        setTimeout(() => onPrint(printableOrder), 100);
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      alert('Erro ao salvar ordem de serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            {order ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 mt-6"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        >
          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Dados do Cliente</h3>
            
            <div className="space-y-2">
              <Label htmlFor="customerName">Nome do Cliente *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Nome completo do cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Telefone *</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          {/* Service Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Detalhes do Serviço</h3>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Serviço *</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Valor do Serviço *</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="0,00"
                  style={{ textAlign: 'left', direction: 'ltr' }}
                  className="text-left"
                  onFocus={(e) => {
                    e.target.setSelectionRange(0, 0);
                    e.target.focus();
                  }}
                  required
                />
                <div className="text-sm text-muted-foreground">
                  R$ {parseFloat(formData.value || '0').toFixed(2)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value: PaymentMethod) => 
                    setFormData(prev => ({ ...prev, paymentMethod: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status (only when editing) */}
            {order && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: OrderStatus) => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais sobre o serviço..."
                rows={2}
              />
            </div>

            {/* Photos Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Fotos do Aparelho</Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Camera className="w-4 h-4 mr-2" />
                      Adicionar Foto
                    </span>
                  </Button>
                </label>
              </div>
              
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Opções Adicionais</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generateTransaction"
                checked={generateTransaction}
                onCheckedChange={(checked) => setGenerateTransaction(checked as boolean)}
              />
              <Label htmlFor="generateTransaction" className="text-sm">
                Gerar lançamento no caixa (apenas para OS concluídas)
              </Label>
            </div>

            {!order && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completeAndPrint"
                  checked={completeAndPrint}
                  onCheckedChange={(checked) => setCompleteAndPrint(checked as boolean)}
                />
                <Label htmlFor="completeAndPrint" className="text-sm">
                  Concluir OS e imprimir automaticamente
                </Label>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Salvando...' : (order ? 'Atualizar' : 'Criar OS')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}