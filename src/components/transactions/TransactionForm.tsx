// Sistema Lojista - Transaction Form Component

import { useState, useEffect } from 'react';
import { X, Calculator, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCashSessions } from '@/hooks/useCashSessions';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { generateTransactionReceipt } from '@/services/PDFService';
import {
  Transaction,
  TransactionInput,
  TransactionType,
  PaymentMethod,
  PaymentSplit,
  TransactionItem,
} from '@/types';
import MultiplePaymentForm from './MultiplePaymentForm';

interface TransactionFormProps {
  transaction?: Transaction | null;
  onSave: (transaction: TransactionInput) => Promise<Transaction | null> | Transaction | null;
  onCancel: () => void;
}

const AVAILABLE_TRANSACTION_TYPES: TransactionType[] = ['entrada', 'saida'];
const MULTI_ITEM_TRANSACTION_TYPES: TransactionType[] = [...AVAILABLE_TRANSACTION_TYPES, 'venda'];

const isMultiItemType = (type: TransactionType) => MULTI_ITEM_TRANSACTION_TYPES.includes(type);

const TransactionForm = ({ transaction, onSave, onCancel }: TransactionFormProps) => {
  const [formData, setFormData] = useState({
    type: 'entrada' as TransactionType,
    description: '',
    quantity: 1,
    unitPrice: 0,
    paymentMethod: 'dinheiro' as PaymentMethod,
    notes: '',
  });

  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [itemDraft, setItemDraft] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
  });

  const { currentSession } = useCashSessions();
  const { config: receiptConfig } = useReceiptConfig();

  useEffect(() => {
    const normalizeTransactionType = (type: TransactionType): TransactionType =>
      AVAILABLE_TRANSACTION_TYPES.includes(type) ? type : 'entrada';

    if (transaction) {
      const normalizedType = normalizeTransactionType(transaction.type);
      const primaryPaymentMethod = transaction.paymentSplits?.[0]?.method ?? transaction.paymentMethod;

      setFormData({
        type: normalizedType,
        description: transaction.description,
        quantity: transaction.quantity,
        unitPrice: transaction.unitPrice,
        paymentMethod: primaryPaymentMethod,
        notes: transaction.notes || '',
      });

      if (transaction.items && transaction.items.length > 0) {
        setItems(transaction.items);
      } else if (transaction.type === 'venda') {
        const normalizedItems = [
          {
            description: transaction.description,
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            total: transaction.total,
          },
        ];
        setItems(normalizedItems);
      } else {
        setItems([]);
      }

      if (transaction.paymentSplits && transaction.paymentSplits.length > 0) {
        setPaymentSplits(transaction.paymentSplits);
      }
    } else {
      setFormData({
        type: 'entrada',
        description: '',
        quantity: 1,
        unitPrice: 0,
        paymentMethod: 'dinheiro',
        notes: '',
      });
      setItems([]);
      setItemDraft({ description: '', quantity: 1, unitPrice: 0 });
      setPaymentSplits([]);
    }
  }, [transaction]);

  const isMultiItemTransaction = isMultiItemType(formData.type);

  const itemsTotal = items.reduce(
    (acc, item) => acc + (Number.isFinite(item.total) ? item.total : item.quantity * item.unitPrice),
    0
  );
  const total = isMultiItemTransaction ? itemsTotal : formData.quantity * formData.unitPrice;
  const aggregatedQuantity = isMultiItemTransaction
    ? items.reduce((acc, item) => acc + item.quantity, 0)
    : formData.quantity;
  const aggregatedUnitPrice = isMultiItemTransaction
    ? aggregatedQuantity > 0
      ? total / aggregatedQuantity
      : 0
    : formData.unitPrice;

  const handlePaymentSplitsChange = (splits: PaymentSplit[]) => {
    setPaymentSplits(splits);

    if (splits.length > 0) {
      setFormData(prev =>
        prev.paymentMethod === splits[0].method ? prev : { ...prev, paymentMethod: splits[0].method }
      );
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setFormData(prev => ({ ...prev, type: newType }));
    if (!isMultiItemType(newType)) {
      setItems([]);
    }
  };

  const handleAddItem = () => {
    if (!itemDraft.description.trim()) {
      alert('Descrição do item é obrigatória.');
      return;
    }

    const quantity = Number(itemDraft.quantity) || 0;
    const unitPrice = Number(itemDraft.unitPrice) || 0;

    if (quantity <= 0) {
      alert('Quantidade deve ser maior que zero.');
      return;
    }

    const total = Number((quantity * unitPrice).toFixed(2));

    setItems(prev => [
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
    updates: Partial<Omit<TransactionItem, 'total'>> & { description?: string }
  ) => {
    setItems(prev =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next: TransactionItem = {
          ...item,
          ...updates,
        };

        const quantity = Number(next.quantity) || 0;
        const unitPrice = Number(next.unitPrice) || 0;
        next.total = Number((quantity * unitPrice).toFixed(2));

        if (updates.description !== undefined) {
          next.description = updates.description;
        }

        return next;
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent, shouldPrint = false) => {
    e.preventDefault();

    if (!currentSession) {
      alert('Nenhuma seção de caixa aberta. Abra uma seção primeiro.');
      return;
    }

    if (!currentSession.id) {
      alert('Identificador da seção de caixa não disponível. Recarregue a página e tente novamente.');
      return;
    }

    if (isMultiItemTransaction) {
      if (items.length === 0) {
        alert('Adicione ao menos um item.');
        return;
      }

      if (items.some(item => !item.description.trim())) {
        alert('Todos os itens precisam de uma descrição.');
        return;
      }
    } else if (!formData.description.trim()) {
      alert('Descrição é obrigatória.');
      return;
    }

    const clientGeneratedId =
      transaction?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
        : undefined);

    const primaryPaymentMethod = paymentSplits[0]?.method ?? formData.paymentMethod;
    const transactionItems = isMultiItemTransaction ? items : undefined;
    const fallbackDescription =
      transactionItems && transactionItems.length > 0
        ? formData.description.trim() ||
          (transactionItems.length === 1
            ? transactionItems[0].description
            : `${transactionItems[0].description} + ${transactionItems.length - 1} itens`)
        : formData.description.trim();

    const newTransaction: TransactionInput = {
      ...(transaction?.id ? { id: transaction.id } : {}),
      sessionId: currentSession.id,
      type: formData.type,
      description: fallbackDescription,
      quantity: aggregatedQuantity,
      unitPrice: Number(aggregatedUnitPrice.toFixed(2)),
      total: Number(total.toFixed(2)),
      paymentMethod: primaryPaymentMethod,
      paymentSplits: paymentSplits.length > 1 ? paymentSplits : undefined,
      items: transactionItems,
      notes: formData.notes.trim() || undefined,
      createdAt: transaction?.createdAt || new Date().toISOString(),
    };

    const savedTransaction = await onSave(newTransaction);

    if (shouldPrint) {
      if (!savedTransaction) {
        console.warn('⚠️ Transação não salva. Recibo não será gerado.');
        return;
      }

      try {
        const printableTransaction: Transaction = {
          ...savedTransaction,
          id: savedTransaction.id ?? clientGeneratedId,
          createdAt: savedTransaction.createdAt || new Date().toISOString(),
        };

        generateTransactionReceipt(printableTransaction, receiptConfig);
      } catch (error) {
        console.error('❌ Erro ao imprimir transação:', error);
        alert(`Erro ao imprimir recibo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  };

  const transactionTypeLabels: Record<TransactionType, string> = {
    entrada: 'Entrada',
    saida: 'Saída',
    venda: 'Venda',
    despesa: 'Despesa',
  };

  const transactionTypeOptions: Array<{ value: TransactionType; label: string }> =
    AVAILABLE_TRANSACTION_TYPES.map(type => ({
      value: type,
      label: transactionTypeLabels[type],
    }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {transaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type */}
            <div>
              <Label>Tipo de Movimento</Label>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-2 mt-2">
                {transactionTypeOptions.map(option => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={formData.type === option.value ? 'default' : 'outline'}
                    onClick={() => handleTypeChange(option.value)}
                    className="h-12"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {isMultiItemTransaction ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Itens do lançamento</Label>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4 space-y-1">
                      <Label htmlFor="itemDraftDescription">Descrição</Label>
                      <Input
                        id="itemDraftDescription"
                        value={itemDraft.description}
                        onChange={e =>
                          setItemDraft(prev => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Informe a descrição do produto ou serviço"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label htmlFor="itemDraftQuantity">Quantidade</Label>
                      <Input
                        id="itemDraftQuantity"
                        type="number"
                        min="1"
                        step="1"
                        value={itemDraft.quantity}
                        onChange={e =>
                          setItemDraft(prev => ({
                            ...prev,
                            quantity: parseInt(e.target.value) || 1,
                          }))
                        }
                        placeholder="Ex.: 2"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label htmlFor="itemDraftUnitPrice">Preço unitário</Label>
                      <Input
                        id="itemDraftUnitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={itemDraft.unitPrice}
                        onChange={e =>
                          setItemDraft(prev => ({
                            ...prev,
                            unitPrice: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="Ex.: 49,90"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2 whitespace-nowrap"
                        onClick={handleAddItem}
                      >
                        <PlusCircle className="w-4 h-4" /> Adicionar
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
                            <Label htmlFor={`item-${index}-description`}>Descrição</Label>
                            <Input
                              id={`item-${index}-description`}
                              value={item.description}
                              onChange={e => handleUpdateItem(index, { description: e.target.value })}
                              placeholder="Atualize a descrição do item"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label htmlFor={`item-${index}-quantity`}>Quantidade</Label>
                            <Input
                              id={`item-${index}-quantity`}
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={e =>
                                handleUpdateItem(index, { quantity: parseInt(e.target.value) || 1 })
                              }
                              placeholder="Ex.: 2"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label htmlFor={`item-${index}-unit-price`}>Preço unitário</Label>
                            <Input
                              id={`item-${index}-unit-price`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e =>
                                handleUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                              }
                              placeholder="Ex.: 49,90"
                            />
                          </div>
                          <div className="md:col-span-2 flex items-center">
                            <span className="font-semibold">R$ {item.total.toFixed(2)}</span>
                          </div>
                          <div className="md:col-span-1 flex items-center justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição geral (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição resumida do lançamento"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Digite a descrição do item/serviço"
                    required
                  />
                </div>

                {/* Quantity and Unit Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.quantity}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          quantity: parseInt(e.target.value) || 1,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          unitPrice: parseFloat(e.target.value) || 0,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Total */}
            <div className="p-4 bg-primary/5 rounded-lg">
              <Label className="text-sm text-muted-foreground">Total</Label>
              <p className="text-2xl font-bold text-primary">R$ {total.toFixed(2)}</p>
            </div>

            {/* Payment Method */}
            <MultiplePaymentForm
              total={total}
              defaultMethod={formData.paymentMethod}
              onChange={handlePaymentSplitsChange}
            />

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" onClick={e => handleSubmit(e, false)} className="flex-1">
                {transaction ? 'Atualizar' : 'Salvar'}
              </Button>
              {isMultiItemTransaction && (
                <Button
                  type="button"
                  onClick={e => handleSubmit(e, true)}
                  variant="secondary"
                  className="flex-1"
                >
                  Salvar e Imprimir
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;
