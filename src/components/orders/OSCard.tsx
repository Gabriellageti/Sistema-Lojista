import { useState } from 'react';
import { Phone, MessageCircle, Printer, Edit, Trash2, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ServiceOrder } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OSCardProps {
  order: ServiceOrder;
  onEdit: (order: ServiceOrder) => void;
  onDelete: (id: string) => void;
  onPrint: (order: ServiceOrder) => void;
  onStatusChange: (id: string, status: 'aberta' | 'concluida' | 'cancelada') => void;
}

const statusConfig = {
  aberta: {
    label: 'Em Andamento',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
    icon: RotateCcw,
    nextStatus: 'concluida' as const,
    nextLabel: 'Concluir'
  },
  concluida: {
    label: 'Concluída',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200',
    icon: CheckCircle2,
    nextStatus: 'aberta' as const,
    nextLabel: 'Reabrir'
  },
  cancelada: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    icon: XCircle,
    nextStatus: 'aberta' as const,
    nextLabel: 'Reabrir'
  }
};

const paymentLabels = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Débito',
  cartao_credito: 'Crédito',
  outros: 'Outros'
};

export default function OSCard({ order, onEdit, onDelete, onPrint, onStatusChange }: OSCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStatusChangeOpen, setIsStatusChangeOpen] = useState(false);

  const statusInfo = statusConfig[order.status];
  const StatusIcon = statusInfo.icon;

  const handleCall = () => {
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    window.open(`tel:${cleanPhone}`, '_blank');
  };

  const handleWhatsApp = () => {
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const message = `Olá ${order.customerName}! Sobre sua OS #${order.id.slice(-4)} - ${order.description}`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleStatusChange = () => {
    if (order.status === 'aberta' && statusInfo.nextStatus === 'concluida') {
      // Perguntar se quer concluir
      setIsStatusChangeOpen(true);
    } else {
      // Mudança direta para outros casos
      onStatusChange(order.id, statusInfo.nextStatus);
    }
  };

  const getValueColor = () => {
    switch (order.status) {
      case 'aberta':
        return 'text-primary font-semibold';
      case 'concluida':
        return 'text-emerald-600 font-medium';
      case 'cancelada':
        return 'text-muted-foreground line-through';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Card className={cn("hs-card transition-all hover:shadow-md", order.status === 'aberta' && "border-l-4 border-l-primary")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{order.customerName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              {order.customerPhone}
            </div>
          </div>
          <Badge className={cn("transition-colors", statusInfo.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        <p className="text-sm text-foreground line-clamp-2">
          {order.description}
        </p>

        {/* Value and Payment */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className={cn("text-lg font-semibold", getValueColor())}>
              R$ {order.value.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {paymentLabels[order.paymentMethod]}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{format(new Date(order.createdAt), 'dd/MM/yyyy')}</div>
            <div>{format(new Date(order.createdAt), 'HH:mm')}</div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground line-clamp-1">
              💬 {order.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleCall}>
                  <Phone className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ligar para cliente</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleWhatsApp}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar WhatsApp</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => {
                  console.log('🖨️ BOTÃO IMPRIMIR CLICADO! Ordem:', order.id);
                  onPrint(order);
                }}>
                  <Printer className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Imprimir OS</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleStatusChange}>
                  <StatusIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{statusInfo.nextLabel}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onEdit(order)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar OS</TooltipContent>
            </Tooltip>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Enviar OS para a lixeira</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar Ordem de Serviço para a lixeira</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja enviar a OS de <strong>{order.customerName}</strong> para a
                    lixeira? Você poderá restaurá-la ou removê-la definitivamente depois.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(order.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Enviar para lixeira
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>

      {/* Status Change Confirmation */}
      <AlertDialog open={isStatusChangeOpen} onOpenChange={setIsStatusChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Ordem de Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar a OS de <strong>{order.customerName}</strong> como concluída?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onStatusChange(order.id, 'concluida');
              setIsStatusChangeOpen(false);
            }}>
              Concluir OS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}