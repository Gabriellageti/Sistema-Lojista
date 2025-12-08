import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { X, CreditCard, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CreditSaleItem } from '@/types';

export interface CreditSaleFormValues {
  customerName: string;
  customerPhone?: string;
  description: string;
  items: CreditSaleItem[];
  total: number;
  dueDate: string;
  installments: number;
  notes?: string;
  amountPaid?: number;
  remainingAmount?: number;
}

interface CreditSaleFormProps {
  sale?: {
    customerName: string;
    customerPhone?: string | null;
    description: string;
    items?: CreditSaleItem[] | null;
    total: number;
    amountPaid: number;
    installments: number;
    chargeDate: string;
    notes?: string | null;
  } | null;
  onSave: (values: CreditSaleFormValues) => Promise<unknown> | unknown;
  onCancel: () => void;
}

interface CreditSaleFormState {
  customerName: string;
  customerPhone: string;
  description: string;
  dueDate: string;
  installments: string;
  notes: string;
}

const formatDateForInput = (date: Date) => format(date, 'yyyy-MM-dd');
const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const createEmptyFormState = (): CreditSaleFormState => ({
  customerName: '',
  customerPhone: '',
  description: '',
  dueDate: formatDateForInput(addDays(new Date(), 30)),
  installments: '1',
  notes: '',
});

const createDefaultItems = (description: string, total: number): CreditSaleItem[] => {
  const safeTotal = roundCurrency(total || 0);
  if (!description && safeTotal <= 0) return [];

  return [
    {
      description: description || 'Item',
      quantity: 1,
      unitPrice: safeTotal,
      total: safeTotal,
    },
  ];
};

const CreditSaleForm = ({ sale, onSave, onCancel }: CreditSaleFormProps) => {
  const [formData, setFormData] = useState<CreditSaleFormState>(() => {
    if (sale) {
      return {
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || '',
        description: sale.description,
        dueDate: formatDateForInput(new Date(sale.chargeDate)),
        installments: sale.installments.toString(),
        notes: sale.notes || '',
      };
    }
    return createEmptyFormState();
  });
  const [items, setItems] = useState<CreditSaleItem[]>(() =>
    sale?.items && sale.items.length > 0
      ? sale.items
      : sale
      ? createDefaultItems(sale.description, sale.total)
      : [],
  );
  const [itemDraft, setItemDraft] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
  });
  const [baseAmountPaid, setBaseAmountPaid] = useState<number>(sale?.amountPaid ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sale) {
      setFormData({
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || '',
        description: sale.description,
        dueDate: formatDateForInput(new Date(sale.chargeDate)),
        installments: sale.installments.toString(),
        notes: sale.notes || '',
      });
      setItems(
        sale.items && sale.items.length > 0
          ? sale.items
          : createDefaultItems(sale.description, sale.total),
      );
      setBaseAmountPaid(sale.amountPaid ?? 0);
      setItemDraft({ description: '', quantity: 1, unitPrice: 0 });
    } else {
      setFormData(createEmptyFormState());
      setItems([]);
      setItemDraft({ description: '', quantity: 1, unitPrice: 0 });
      setBaseAmountPaid(0);
    }
  }, [sale]);

  const handleFormChange = <K extends keyof CreditSaleFormState>(
    field: K,
    value: CreditSaleFormState[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const itemsTotal = roundCurrency(
    items.reduce(
      (acc, item) => acc + (Number.isFinite(item.total) ? item.total : item.quantity * item.unitPrice),
      0,
    ),
  );
  const remainingAmount = Math.max(itemsTotal - (baseAmountPaid ?? 0), 0);

  const handleAddItem = () => {
    if (!itemDraft.description.trim()) {
      toast.error('Descrição do item é obrigatória.');
      return;
    }

    const quantity = Number(itemDraft.quantity) || 0;
    const unitPrice = Number(itemDraft.unitPrice) || 0;

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero.');
      return;
    }

    const total = roundCurrency(quantity * unitPrice);

    setItems((prev) => [
      ...prev,
      {
        description: itemDraft.description.trim(),
        quantity,
        unitPrice,
        total,
      },
    ]);

    setItemDraft({ description: '', quantity: 1, unitPrice: 0 });
  };

  const handleUpdateItem = (
    index: number,
    updates: Partial<Omit<CreditSaleItem, 'total'>> & { description?: string },
  ) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next: CreditSaleItem = {
          ...item,
          ...updates,
        };

        const quantity = Number(next.quantity) || 0;
        const unitPrice = Number(next.unitPrice) || 0;
        next.total = roundCurrency(quantity * unitPrice);

        if (updates.description !== undefined) {
          next.description = updates.description;
        }

        return next;
      }),
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.customerName.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à venda.');
      return;
    }

    if (!formData.dueDate) {
      toast.error('Escolha uma data de vencimento');
      return;
    }

    const installments = Math.max(Number(formData.installments) || 1, 1);
    const fallbackDescription =
      formData.description.trim() ||
      (items.length === 1
        ? items[0].description
        : `${items[0].description} + ${items.length - 1} itens`);

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim() || undefined,
        description: fallbackDescription,
        items,
        total: itemsTotal,
        dueDate: formData.dueDate,
        installments,
        notes: formData.notes.trim() || undefined,
        amountPaid: baseAmountPaid,
        remainingAmount,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {sale ? 'Editar venda a prazo' : 'Registrar venda a prazo'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {sale
                ? 'Atualize os dados da venda a prazo e os itens vendidos.'
                : 'Controle suas vendas parceladas com detalhamento de itens.'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="credit-customer-name">Cliente</Label>
                <Input
                  id="credit-customer-name"
                  placeholder="Nome do cliente"
                  value={formData.customerName}
                  onChange={(event) => handleFormChange('customerName', event.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="credit-customer-phone">Contato</Label>
                <Input
                  id="credit-customer-phone"
                  placeholder="(11) 98888-1234"
                  value={formData.customerPhone}
                  onChange={(event) => handleFormChange('customerPhone', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Itens da venda</Label>
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-5 space-y-1">
                    <Label htmlFor="credit-item-description">Descrição</Label>
                    <Input
                      id="credit-item-description"
                      value={itemDraft.description}
                      onChange={(event) =>
                        setItemDraft((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Produto, conserto ou serviço"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label htmlFor="credit-item-quantity">Quantidade</Label>
                    <Input
                      id="credit-item-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={itemDraft.quantity}
                      onChange={(event) =>
                        setItemDraft((prev) => ({
                          ...prev,
                          quantity: parseInt(event.target.value) || 1,
                        }))
                      }
                      placeholder="1"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <Label htmlFor="credit-item-unit-price">Preço unitário</Label>
                    <Input
                      id="credit-item-unit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemDraft.unitPrice}
                      onChange={(event) =>
                        setItemDraft((prev) => ({
                          ...prev,
                          unitPrice: parseFloat(event.target.value) || 0,
                        }))
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={handleAddItem}
                    >
                      <PlusCircle className="h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Itens adicionados</Label>
                    <span className="text-sm text-muted-foreground">{items.length} item(s)</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={`${item.description}-${index}`}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="md:col-span-5 space-y-1">
                          <Label htmlFor={`credit-item-${index}-description`}>Descrição</Label>
                          <Input
                            id={`credit-item-${index}-description`}
                            value={item.description}
                            onChange={(event) =>
                              handleUpdateItem(index, { description: event.target.value })
                            }
                            placeholder="Descrição do item"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label htmlFor={`credit-item-${index}-quantity`}>Quantidade</Label>
                          <Input
                            id={`credit-item-${index}-quantity`}
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              handleUpdateItem(index, {
                                quantity: parseInt(event.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <Label htmlFor={`credit-item-${index}-unit-price`}>Preço unitário</Label>
                          <Input
                            id={`credit-item-${index}-unit-price`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              handleUpdateItem(index, {
                                unitPrice: parseFloat(event.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-1 flex items-center font-semibold">
                          {formatCurrency(item.total)}
                        </div>
                        <div className="md:col-span-1 flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-description">Descrição geral (opcional)</Label>
              <Textarea
                id="credit-description"
                placeholder="Resumo da venda ou anotação geral"
                value={formData.description}
                onChange={(event) => handleFormChange('description', event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-muted/40 space-y-1">
                <p className="text-sm text-muted-foreground">Total dos itens</p>
                <p className="text-2xl font-bold">{formatCurrency(itemsTotal)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/40 space-y-1">
                <p className="text-sm text-muted-foreground">Já pago</p>
                <p className="text-2xl font-bold">{formatCurrency(baseAmountPaid)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/40 space-y-1">
                <p className="text-sm text-muted-foreground">Restante</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(remainingAmount)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="credit-installments">Número de parcelas</Label>
                <Select
                  value={formData.installments}
                  onValueChange={(value) => handleFormChange('installments', value)}
                >
                  <SelectTrigger id="credit-installments">
                    <SelectValue placeholder="Qtd" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }).map((_, index) => {
                      const option = (index + 1).toString();
                      return (
                        <SelectItem key={`installment-${option}`} value={option}>
                          {option}x
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="credit-due-date">Vencimento da primeira parcela</Label>
                <Input
                  id="credit-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) => handleFormChange('dueDate', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credit-notes">Observações</Label>
              <Textarea
                id="credit-notes"
                placeholder="Adicione informações adicionais..."
                value={formData.notes}
                onChange={(event) => handleFormChange('notes', event.target.value)}
              />
            </div>

            <CardFooter className="flex justify-end gap-2 px-0">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="hero" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar venda a prazo'}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditSaleForm;
