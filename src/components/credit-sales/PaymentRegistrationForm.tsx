import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentMethod } from '@/types';
import { PAYMENT_METHOD_LABELS } from './payment-method-labels';
import { X } from 'lucide-react';

interface PaymentRegistrationFormProps {
  creditSaleId: string;
  remainingAmount: number;
  onSave: (payment: {
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    sessionId?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PaymentRegistrationForm({ creditSaleId, remainingAmount, onSave, onCancel }: PaymentRegistrationFormProps) {
  const [amount, setAmount] = useState(remainingAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    if (amountValue > remainingAmount) {
      alert(`O valor não pode ser maior que o valor restante (R$ ${remainingAmount.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        amount: amountValue,
        paymentMethod,
        paymentDate: (() => {
          const selectedDate = new Date(paymentDate + 'T00:00:00');
          const now = new Date();
          // Se a data selecionada é hoje, usar a hora atual
          if (selectedDate.toDateString() === now.toDateString()) {
            return now.toISOString();
          }
          // Caso contrário, usar 12:00 como padrão
          return new Date(paymentDate + 'T12:00:00').toISOString();
        })(),
        notes: notes.trim() || null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Registrar Pagamento</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={isSubmitting}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do Pagamento</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Valor restante: R$ {remainingAmount.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} disabled={isSubmitting}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data do Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre este pagamento..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Salvando...' : 'Registrar Pagamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
