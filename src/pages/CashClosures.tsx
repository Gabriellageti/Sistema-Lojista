// Help Smart - Cash Closures Page

import { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCashSessions } from '@/hooks/useCashSessions';
import { CashSession, Transaction } from '@/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CashClosureDetails from '@/components/cash/CashClosureDetails';

const CashClosures = () => {
  const { sessions, deleteSession, restoreSession } = useCashSessions();
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  
  const closedSessions = sessions.filter(s => s.isClosed).sort((a, b) => 
    new Date(b.closedAt || b.date).getTime() - new Date(a.closedAt || a.date).getTime()
  );

  const handleSessionClick = (session: CashSession) => {
    setSelectedSession(session);
  };

  const handleBackToList = () => {
    setSelectedSession(null);
  };

  if (selectedSession) {
    return (
      <CashClosureDetails
        session={selectedSession}
        onBack={handleBackToList}
        deleteSession={deleteSession}
        restoreSession={restoreSession}
      />
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-primary">Fechamentos de Caixa</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Histórico de fechamentos realizados
          </p>
        </div>
        <Badge variant="secondary" className="text-xs sm:text-sm">
          {closedSessions.length} fechamentos
        </Badge>
      </div>

      {/* Closures List */}
      {closedSessions.length === 0 ? (
        <Card className="hs-card">
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fechamento encontrado</h3>
            <p className="text-muted-foreground">
              Os fechamentos de caixa aparecerão aqui após serem realizados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {closedSessions.map((session) => (
            <Card 
              key={session.id} 
              className="hs-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSessionClick(session)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">
                        {format(parseISO(session.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      {session.closedAt && (
                        <span className="text-xs text-muted-foreground">
                          Fechado às {format(parseISO(session.closedAt), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Inicial</p>
                        <p className="font-medium text-sm">
                          R$ {session.initialAmount?.toFixed(2) || '0,00'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Vendas</p>
                        <p className="font-medium text-sm text-emerald-600">
                          R$ {session.totalSales?.toFixed(2) || '0,00'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Final</p>
                        <p className="font-medium text-sm text-primary">
                          R$ {session.finalAmount?.toFixed(2) || '0,00'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Transações</p>
                        <p className="font-medium text-sm">
                          {session.salesCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-muted-foreground ml-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CashClosures;