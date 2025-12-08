// Sistema Lojista - Multiple Payment Form Component

import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PaymentSplit, PaymentMethod } from '@/types';

interface MultiplePaymentFormProps {
  total: number;
  onChange: (splits: PaymentSplit[]) => void;
  defaultMethod: PaymentMethod;
}

const MultiplePaymentForm = ({ total, onChange, defaultMethod }: MultiplePaymentFormProps) => {
  const [useMultiple, setUseMultiple] = useState(false);
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { method: defaultMethod, amount: total }
  ]);

  const paymentLabels = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_debito: 'Cartão Débito',
    cartao_credito: 'Cartão Crédito',
    outros: 'Outros',
  };

  useEffect(() => {
    // Update splits when total changes
    if (!useMultiple) {
      const newSplits = [{ method: defaultMethod, amount: total }];
      setSplits(newSplits);
      onChange(newSplits);
    } else {
      // Distribute proportionally if using multiple
      const currentTotal = splits.reduce((sum, split) => sum + split.amount, 0);
      if (currentTotal !== total && currentTotal > 0) {
        const ratio = total / currentTotal;
        const newSplits = splits.map(split => ({
          ...split,
          amount: parseFloat((split.amount * ratio).toFixed(2))
        }));
        setSplits(newSplits);
        onChange(newSplits);
      }
    }
  }, [total, defaultMethod, useMultiple]);

  const handleMultipleToggle = (enabled: boolean) => {
    setUseMultiple(enabled);
    if (!enabled) {
      const newSplits = [{ method: defaultMethod, amount: total }];
      setSplits(newSplits);
      onChange(newSplits);
    } else {
      // Initialize with two payment methods
      const halfAmount = total / 2;
      const newSplits: PaymentSplit[] = [
        { method: defaultMethod, amount: halfAmount },
        { method: 'pix' as PaymentMethod, amount: halfAmount }
      ];
      setSplits(newSplits);
      onChange(newSplits);
    }
  };

  const addPaymentSplit = () => {
    if (splits.length < 3) {
      const remainingAmount = total - splits.reduce((sum, split) => sum + split.amount, 0);
      const newSplit: PaymentSplit = {
        method: 'dinheiro' as PaymentMethod,
        amount: Math.max(0, remainingAmount)
      };
      const newSplits = [...splits, newSplit];
      setSplits(newSplits);
      onChange(newSplits);
    }
  };

  const removePaymentSplit = (index: number) => {
    if (splits.length > 1) {
      const newSplits = splits.filter((_, i) => i !== index);
      setSplits(newSplits);
      onChange(newSplits);
    }
  };

  const updateSplit = (index: number, field: keyof PaymentSplit, value: any) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
    onChange(newSplits);
  };

  const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
  const difference = total - totalSplits;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="multiple-payment"
          checked={useMultiple}
          onCheckedChange={handleMultipleToggle}
        />
        <Label htmlFor="multiple-payment">Múltiplas formas de pagamento</Label>
      </div>

      {useMultiple ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {splits.map((split, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Forma {index + 1}</Label>
                  <select
                    value={split.method}
                    onChange={(e) => updateSplit(index, 'method', e.target.value as PaymentMethod)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    {Object.entries(paymentLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={split.amount}
                    onChange={(e) => updateSplit(index, 'amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                {splits.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePaymentSplit(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {splits.length < 3 && (
            <Button
              type="button"
              variant="outline"
              onClick={addPaymentSplit}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Forma de Pagamento
            </Button>
          )}

          {Math.abs(difference) > 0.01 && (
            <div className={`p-3 rounded-lg ${difference > 0 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
              <p className="text-sm font-medium">
                {difference > 0 
                  ? `Faltam R$ ${difference.toFixed(2)}` 
                  : `Excesso de R$ ${Math.abs(difference).toFixed(2)}`
                }
              </p>
            </div>
          )}

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total das formas:</span>
              <span className="font-medium">R$ {totalSplits.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total da venda:</span>
              <span className="font-medium">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Label>Forma de Pagamento</Label>
          <select
            value={splits[0]?.method || defaultMethod}
            onChange={(e) => updateSplit(0, 'method', e.target.value as PaymentMethod)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-2"
          >
            {Object.entries(paymentLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default MultiplePaymentForm;