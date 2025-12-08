import { useState } from 'react';
import { ServiceOrder, OrderStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  Printer, 
  Phone, 
  Clock, 
  DollarSign,
  User,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Camera,
  Shield,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OSListViewProps {
  orders: ServiceOrder[];
  onEdit: (order: ServiceOrder) => void;
  onDelete: (id: string) => void;
  onPrint: (order: ServiceOrder, viaType: 'cliente' | 'loja') => void;
  onPrintWarranty: (order: ServiceOrder) => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}

interface OrderRowProps {
  order: ServiceOrder;
  onEdit: (order: ServiceOrder) => void;
  onDelete: (id: string) => void;
  onPrint: (order: ServiceOrder, viaType: 'cliente' | 'loja') => void;
  onPrintWarranty: (order: ServiceOrder) => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}

const statusConfig = {
  aberta: { 
    label: 'Aberta', 
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    icon: Clock
  },
  concluida: { 
    label: 'Concluída', 
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    icon: CheckCircle2
  },
  cancelada: { 
    label: 'Cancelada', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: XCircle
  }
};

const paymentMethodLabels = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  outros: 'Outros'
};

function OrderRow({ order, onEdit, onDelete, onPrint, onPrintWarranty, onStatusChange }: OrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusInfo = statusConfig[order.status];

  return (
    <Card className="hs-card hover:shadow-md transition-all duration-200">
      <CardContent className="p-0">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Expand Icon */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-semibold text-foreground truncate">
                      {order.customerName}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {order.description}
                  </p>
                </div>

                {/* Value */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-lg font-bold text-primary">
                    <DollarSign className="w-4 h-4" />
                    R$ {order.value.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.createdAt), 'dd/MM HH:mm')}
                  </p>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  <Badge className={cn("text-xs", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Left Column - Details */}
                <div className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Contato
                    </h4>
                    <div className="ml-6 space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="font-medium">Telefone:</span> 
                        <a
                          href={`https://wa.me/55${order.customerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.customerPhone}
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Detalhes do Serviço
                    </h4>
                    <div className="ml-6 space-y-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Descrição:</span> {order.description}
                      </p>
                      {order.notes && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Observações:</span> {order.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Payment & Actions */}
                <div className="space-y-4">
                  {/* Payment Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Pagamento
                    </h4>
                    <div className="ml-6 space-y-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Forma:</span> {paymentMethodLabels[order.paymentMethod]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Valor:</span> R$ {order.value.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Photos */}
                  {order.photos && order.photos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Fotos ({order.photos.length})
                      </h4>
                      <div className="ml-6 grid grid-cols-3 gap-2">
                        {order.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(photo, '_blank');
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Ações</h4>
                    <div className="ml-6 flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(order);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Editar
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Imprimir
                            <MoreVertical className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrint(order, 'cliente');
                            }}
                          >
                            <Printer className="w-3 h-3 mr-2" />
                            Via Cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrint(order, 'loja');
                            }}
                          >
                            <Printer className="w-3 h-3 mr-2" />
                            Via Loja
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrintWarranty(order);
                        }}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Garantia
                      </Button>

                      {order.status === 'aberta' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(order.id, 'concluida');
                          }}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          Concluir
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Tem certeza que deseja enviar a OS de "${order.customerName}" para a lixeira?`,
                            )
                          ) {
                            onDelete(order.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Enviar para lixeira
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function OSListView({ orders, onEdit, onDelete, onPrint, onPrintWarranty, onStatusChange }: OSListViewProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <FileText className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhuma ordem de serviço encontrada
        </h3>
        <p className="text-muted-foreground mb-4">
          Não há ordens de serviço que correspondam aos filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <OrderRow
          key={order.id}
          order={order}
          onEdit={onEdit}
          onDelete={onDelete}
          onPrint={onPrint}
          onPrintWarranty={onPrintWarranty}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}