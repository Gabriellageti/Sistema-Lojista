import { useState } from 'react';
import { Trash2, RefreshCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { EmptyTrashResult, TrashItem, useTrash } from '@/hooks/useTrash';

const formatDeletedSummary = (result: EmptyTrashResult) => {
  const parts: string[] = [];

  if (result.sessionsRemoved > 0) {
    parts.push(
      `${result.sessionsRemoved} sessão${result.sessionsRemoved > 1 ? 's' : ''} de caixa removida${
        result.sessionsRemoved > 1 ? 's' : ''
      }`,
    );
  }

  if (result.ordersRemoved > 0) {
    parts.push(
      `${result.ordersRemoved} ordem${result.ordersRemoved > 1 ? 's' : ''} de serviço removida${
        result.ordersRemoved > 1 ? 's' : ''
      }`,
    );
  }

  if (result.transactionsRemoved > 0) {
    parts.push(
      `${result.transactionsRemoved} lançamento${result.transactionsRemoved > 1 ? 's' : ''} removido${
        result.transactionsRemoved > 1 ? 's' : ''
      }`,
    );
  }

  if (parts.length === 0) {
    return 'Nenhum item foi removido.';
  }

  return parts.join(' • ');
};

const getItemTypeLabel = (type: TrashItem['type']) => {
  switch (type) {
    case 'cash_session':
      return 'Sessão de caixa';
    case 'service_order':
      return 'Ordem de serviço';
    case 'transaction':
      return 'Lançamento';
    default:
      return 'Item';
  }
};

const getBadgeVariant = (type: TrashItem['type']) => {
  switch (type) {
    case 'cash_session':
      return 'secondary';
    case 'transaction':
      return 'outline';
    default:
      return 'default';
  }
};

const getRestoreSuccessMessage = (type: TrashItem['type']) => {
  switch (type) {
    case 'cash_session':
      return 'Sessão de caixa restaurada com sucesso.';
    case 'service_order':
      return 'Ordem de serviço restaurada com sucesso.';
    case 'transaction':
      return 'Lançamento restaurado com sucesso.';
    default:
      return 'Item restaurado com sucesso.';
  }
};

const TrashPage = () => {
  const { items, loading, restoreItem, emptyTrash, reload } = useTrash();
  const { toast } = useToast();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);

  const handleRestore = async (item: TrashItem) => {
    setRestoringId(item.id);
    const restored = await restoreItem(item);
    setRestoringId(null);

    if (restored) {
      toast({
        title: 'Item restaurado',
        description: getRestoreSuccessMessage(item.type),
      });
    }
  };

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    const result = await emptyTrash();
    setIsEmptying(false);

    if (result) {
      setIsDialogOpen(false);
      toast({
        title: 'Lixeira esvaziada',
        description: formatDeletedSummary(result),
      });
    }
  };

  const handleReload = () => {
    reload();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Lixeira</h1>
          <p className="text-sm text-muted-foreground">
            Visualize itens removidos recentemente e restaure sessões de caixa, ordens de serviço ou lançamentos quando
            necessário.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReload} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Atualizar
          </Button>
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={loading || items.length === 0}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Esvaziar lixeira
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão permanente</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover definitivamente todas as sessões de caixa, ordens de serviço e lançamentos
                  presentes na lixeira. Lançamentos associados às ordens de serviço também serão excluídos. Esta operação
                  não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isEmptying}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleEmptyTrash} disabled={isEmptying} className="gap-2">
                  {isEmptying && <Loader2 className="w-4 h-4 animate-spin" />}
                  Esvaziar agora
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p>Carregando itens da lixeira...</p>
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <Trash2 className="w-10 h-10 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Nenhum item na lixeira</h2>
            <p className="text-sm text-muted-foreground">
              Itens removidos aparecerão aqui por tempo limitado. Quando existirem registros, você poderá restaurá-los ou
              removê-los permanentemente.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {items.map(item => (
          <Card key={`${item.type}-${item.id}`} className="shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getBadgeVariant(item.type)}>
                    {getItemTypeLabel(item.type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Removido em {item.deletedAtLabel}
                  </span>
                </div>
                <CardTitle className="text-xl font-semibold">{item.summary.title}</CardTitle>
                {item.summary.subtitle ? (
                  <p className="text-sm text-muted-foreground">{item.summary.subtitle}</p>
                ) : null}
                {item.summary.description ? (
                  <p className="text-sm text-muted-foreground max-w-3xl">
                    {item.summary.description}
                  </p>
                ) : null}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={restoringId === item.id}
                onClick={() => handleRestore(item)}
                className="gap-2"
              >
                {restoringId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Restaurar
              </Button>
            </CardHeader>
            {item.summary.details.length > 0 ? (
              <CardContent className="pt-0">
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {item.summary.details.map(detail => (
                    <div key={`${item.id}-${detail.label}`} className="space-y-1">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{detail.label}</dt>
                      <dd className="text-sm font-medium text-foreground">{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TrashPage;
