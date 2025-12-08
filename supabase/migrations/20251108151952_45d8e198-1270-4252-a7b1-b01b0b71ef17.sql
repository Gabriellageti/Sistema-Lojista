-- Create enum for credit sale status if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_sale_status') THEN
    CREATE TYPE public.credit_sale_status AS ENUM ('em_aberto', 'paga');
  END IF;
END$$;

-- Ensure payment_method enum already exists (used by other tables)
-- No changes; referenced by existing tables

-- Create credit_sales table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NULL,
  description TEXT NOT NULL,
  total NUMERIC NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL,
  charge_date TIMESTAMPTZ NOT NULL,
  status public.credit_sale_status NOT NULL DEFAULT 'em_aberto',
  payment_method public.payment_method NULL,
  payment_date TIMESTAMPTZ NULL,
  payment_transaction_id UUID NULL,
  session_id UUID NULL,
  reminder_preferences JSONB NULL,
  notes TEXT NULL,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT credit_sales_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.cash_sessions (id) ON DELETE SET NULL,
  CONSTRAINT credit_sales_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.transactions (id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_sales_charge_date ON public.credit_sales (charge_date);
CREATE INDEX IF NOT EXISTS idx_credit_sales_status ON public.credit_sales (status);
CREATE INDEX IF NOT EXISTS idx_credit_sales_deleted_at ON public.credit_sales (deleted_at);
CREATE INDEX IF NOT EXISTS idx_credit_sales_customer_name ON public.credit_sales (customer_name);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_credit_sales_set_updated_at ON public.credit_sales;
CREATE TRIGGER trg_credit_sales_set_updated_at
BEFORE UPDATE ON public.credit_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS and permissive policy similar to other tables
ALTER TABLE public.credit_sales ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'credit_sales' AND policyname = 'Allow all operations on credit_sales'
  ) THEN
    CREATE POLICY "Allow all operations on credit_sales" ON public.credit_sales FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;