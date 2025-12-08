// Help Smart - Floating Action Buttons Component

import { useState } from 'react';
import { ShoppingCart, Wrench, Plus, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCashSessions } from '@/hooks/useCashSessions';
import { useToast } from '@/hooks/use-toast';

const FloatingActions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentSession } = useCashSessions();

  const checkCashSession = () => {
    if (!currentSession) {
      toast({
        title: "Seção de caixa necessária",
        description: "Abra uma seção de caixa antes de registrar vendas.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNewSale = () => {
    if (checkCashSession()) {
      if (location.pathname === '/transactions') {
        // If already on transactions page, dispatch custom event
        window.dispatchEvent(new CustomEvent('openTransactionForm'));
      } else {
        navigate('/transactions?action=new&type=venda');
      }
    }
    setIsOpen(false);
  };

  const handleNewCreditSale = () => {
    if (checkCashSession()) {
      if (location.pathname === '/credit-sales') {
        window.dispatchEvent(new CustomEvent('openCreditSaleForm'));
      } else {
        navigate('/credit-sales?action=new');
      }
    }
    setIsOpen(false);
  };

  const handleNewOS = () => {
    if (location.pathname === '/orders') {
      // If already on orders page, dispatch custom event
      window.dispatchEvent(new CustomEvent('openOrderForm'));
    } else {
      navigate('/orders?action=new');
    }
    setIsOpen(false);
  };

  const handleOpenTrash = () => {
    if (location.pathname !== '/trash') {
      navigate('/trash');
    } else {
      window.dispatchEvent(new CustomEvent('focusTrashPage'));
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed right-3 sm:right-6 bottom-3 sm:bottom-6 z-50 flex flex-col gap-2 sm:gap-3">
      {/* Action Buttons */}
      <div className={`flex flex-col gap-2 sm:gap-3 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <Button
          onClick={handleNewSale}
          variant="hero"
          size="icon"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:scale-110 transition-all duration-200"
          title="Nova Venda"
        >
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>

        <Button
          onClick={handleNewCreditSale}
          variant="warning"
          size="icon"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:scale-110 transition-all duration-200"
          title="Nova venda a prazo"
        >
          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>

        <Button
          onClick={handleNewOS}
          variant="secondary"
          size="icon"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:scale-110 transition-all duration-200"
          title="Nova OS"
        >
          <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>

        <Button
          onClick={handleOpenTrash}
          variant="soft"
          size="icon"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:scale-110 transition-all duration-200"
          title="Lixeira"
        >
          <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>

      {/* Main Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="default"
        size="icon"
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl hover:scale-110 transition-all duration-200 ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
        title="Ações Rápidas"
      >
        <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
      </Button>
    </div>
  );
};

export default FloatingActions;