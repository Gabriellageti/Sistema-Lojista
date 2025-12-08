-- Recreate credit sales schema with the expected structure
DROP TABLE IF EXISTS public.credit_sales CASCADE;
DROP TYPE IF EXISTS public.credit_sale_type;
DROP TYPE IF EXISTS public.credit_sale_reminder;
DROP TYPE IF EXISTS public.credit_sale_status;

CREATE TYPE public.credit_sale_status AS ENUM ('em_aberto', 'paga');

CREATE TABLE public.credit_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  description text NOT NULL,
  total numeric(12, 2) NOT NULL,
  sale_date timestamptz NOT NULL,
  charge_date timestamptz NOT NULL,
  status public.credit_sale_status NOT NULL DEFAULT 'em_aberto',
  payment_method public.payment_method,
  payment_date timestamptz,
  payment_transaction_id uuid,
  session_id uuid,
  reminder_preferences jsonb,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

ALTER TABLE public.credit_sales
  ADD CONSTRAINT credit_sales_payment_transaction_id_fkey
  FOREIGN KEY (payment_transaction_id)
  REFERENCES public.transactions(id)
  ON DELETE SET NULL;

ALTER TABLE public.credit_sales
  ADD CONSTRAINT credit_sales_session_id_fkey
  FOREIGN KEY (session_id)
  REFERENCES public.cash_sessions(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credit_sales_charge_date ON public.credit_sales (charge_date);
CREATE INDEX IF NOT EXISTS idx_credit_sales_status ON public.credit_sales (status);
CREATE INDEX IF NOT EXISTS idx_credit_sales_deleted_at ON public.credit_sales (deleted_at);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_credit_sale_id_fkey;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS credit_sale_id uuid;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_credit_sale_id_fkey
  FOREIGN KEY (credit_sale_id)
  REFERENCES public.credit_sales(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_credit_sale_id ON public.transactions (credit_sale_id);

ALTER TABLE public.credit_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all operations on credit_sales"
  ON public.credit_sales
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_credit_sales_updated_at
  BEFORE UPDATE ON public.credit_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
