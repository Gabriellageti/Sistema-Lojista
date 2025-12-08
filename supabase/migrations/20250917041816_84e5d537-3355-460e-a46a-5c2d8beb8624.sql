-- Create all tables for Help Smart application

-- Create cash_sessions table
CREATE TABLE public.cash_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  is_closed BOOLEAN DEFAULT false,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_entries DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_exits DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(10,2),
  sales_count INTEGER DEFAULT 0,
  average_ticket DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'outros');

-- Create transaction type enum  
CREATE TYPE public.transaction_type AS ENUM ('entrada', 'saida', 'venda', 'despesa');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('aberta', 'concluida', 'cancelada');

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method public.payment_method NOT NULL,
  payment_splits JSONB, -- For multiple payment methods
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_orders table
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  description TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  payment_method public.payment_method NOT NULL,
  payment_splits JSONB, -- For multiple payment methods
  status public.order_status NOT NULL DEFAULT 'aberta',
  notes TEXT,
  estimated_deadline TIMESTAMP WITH TIME ZONE,
  photos TEXT[], -- Array of base64 encoded images
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_settings table
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL DEFAULT 'Help Smart',
  store_phone TEXT,
  paper_width INTEGER NOT NULL DEFAULT 80 CHECK (paper_width IN (58, 80, 85)),
  currency TEXT NOT NULL DEFAULT 'BRL',
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  auto_suggestion BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create receipt_config table
CREATE TABLE public.receipt_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_loja TEXT NOT NULL DEFAULT 'Help Smart',
  telefone_loja TEXT,
  instagram_loja TEXT,
  endereco_loja TEXT,
  mensagem_agradecimento TEXT DEFAULT 'Obrigado pela preferência!',
  politica_garantia TEXT DEFAULT 'Produtos com defeito devem ser apresentados com nota fiscal e embalagem original no prazo de 90 dias.',
  largura_bobina INTEGER NOT NULL DEFAULT 80 CHECK (largura_bobina IN (58, 80, 85)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now since there's no authentication yet)
CREATE POLICY "Allow all operations on cash_sessions" ON public.cash_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on service_orders" ON public.service_orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on store_settings" ON public.store_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on receipt_config" ON public.receipt_config FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_cash_sessions_date ON public.cash_sessions(date);
CREATE INDEX idx_cash_sessions_is_open ON public.cash_sessions(is_open);
CREATE INDEX idx_transactions_session_id ON public.transactions(session_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_service_orders_status ON public.service_orders(status);
CREATE INDEX idx_service_orders_created_at ON public.service_orders(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cash_sessions_updated_at
  BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receipt_config_updated_at
  BEFORE UPDATE ON public.receipt_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.store_settings (store_name, paper_width, currency, theme, auto_suggestion)
VALUES ('Help Smart Assistência', 80, 'BRL', 'light', true);

INSERT INTO public.receipt_config (nome_loja, largura_bobina, mensagem_agradecimento, politica_garantia)
VALUES ('Help Smart Assistência', 80, 'Obrigado pela preferência!', 'Produtos com defeito devem ser apresentados com nota fiscal e embalagem original no prazo de 90 dias. Serviços possuem garantia de 30 dias.');