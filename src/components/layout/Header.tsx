// Sistema Lojista - Header Component

import { useState } from 'react';
import { Menu, Settings, Calculator, FileText, ShoppingCart, Wrench, Archive, LogOut, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signOut } = useAuth();

  const menuItems = [
    { path: '/', label: 'Início', icon: Calculator },
    { path: '/transactions', label: 'Lançamentos', icon: ShoppingCart },
    { path: '/credit-sales', label: 'Vendas a Prazo', icon: CreditCard },
    { path: '/orders', label: 'Ordens de Serviço', icon: Wrench },
    { path: '/cash-closures', label: 'Fechamentos', icon: Archive },
    { path: '/reports', label: 'Relatórios', icon: FileText },
    { path: '/settings', label: 'Configurações', icon: Settings },
  ];

  const currentPage = menuItems.find(item => item.path === location.pathname);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <header className="hs-header sticky top-0 z-50 w-full border-b px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Sistema Lojista Logo"
            className="w-12 h-12 drop-shadow"
          />
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Sistema Lojista</h1>
            <p className="text-xs text-primary-foreground/80">Assistência Técnica</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleNavigation(item.path)}
                className={`gap-2 ${isActive ? 'text-secondary-foreground' : 'text-primary-foreground hover:text-secondary-foreground'}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-2 text-primary-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </nav>

        {/* Mobile Menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Menu className="w-6 h-6" />
              </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-4 mt-8">
              <div className="flex items-center gap-3 pb-4 border-b">
                <img
                  src="/logo.svg"
                  alt="Sistema Lojista Logo"
                  className="w-14 h-14 drop-shadow"
                />
                <div>
                  <h2 className="font-bold text-lg text-primary-foreground">Sistema Lojista</h2>
                  <p className="text-sm text-primary-foreground/80">Assistência Técnica</p>
                </div>
              </div>
              
              <nav className="flex flex-col gap-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? "default" : "ghost"}
                      onClick={() => handleNavigation(item.path)}
                      className="justify-start gap-3 h-12 text-left"
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  );
                })}
                
                <div className="border-t pt-2 mt-2">
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className="justify-start gap-3 h-12 text-left w-full text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair
                  </Button>
                </div>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Page Title for Mobile */}
      {currentPage && (
        <div className="md:hidden mt-2 pt-2 border-t border-primary-foreground/20">
          <div className="flex items-center gap-2 text-primary-foreground">
            <currentPage.icon className="w-4 h-4" />
            <span className="font-medium">{currentPage.label}</span>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;