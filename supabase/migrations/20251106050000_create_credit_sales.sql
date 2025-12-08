-- Create enums for credit sales lifecycle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_sale_status') THEN
    CREATE TYPE public.credit_sale_status AS ENUM ('em_aberto', 'vencida', 'paga');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_sale_type') THEN
    CREATE TYPE public.credit_sale_type AS ENUM ('produto', 'ordem_servico');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_sale_reminder') THEN
    CREATE TYPE public.credit_sale_reminder AS ENUM (
      'nenhum',
      'no_dia',
      'um_dia_antes',
      'tres_dias_antes',
      'uma_semana_antes'
    );
  END IF;
END
$$;

-- Create credit_sales table
CREATE TABLE IF NOT EXISTS public.credit_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  customer_document text,
  sale_type public.credit_sale_type NOT NULL,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT timezone('utc', now()),
  due_date timestamptz NOT NULL,
  charge_date timestamptz,
  expected_payment_method public.payment_method,
  notes text,
  reminder_type public.credit_sale_reminder NOT NULL DEFAULT 'nenhum',
  reminder_at timestamptz,
  status public.credit_sale_status NOT NULL DEFAULT 'em_aberto',
  paid_at timestamptz,
  paid_amount numeric(12, 2),
  paid_method public.payment_method,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

COMMENT ON TABLE public.credit_sales IS 'Registros de vendas a prazo e crediário.';
COMMENT ON COLUMN public.credit_sales.sale_type IS 'Identifica se o crédito foi gerado por produto ou ordem de serviço.';
COMMENT ON COLUMN public.credit_sales.charge_date IS 'Data prevista para efetuar a cobrança ativa.';
COMMENT ON COLUMN public.credit_sales.reminder_type IS 'Tipo de lembrete configurado para cobrança.';
COMMENT ON COLUMN public.credit_sales.reminder_at IS 'Data/hora específica para lembrete personalizado.';
COMMENT ON COLUMN public.credit_sales.metadata IS 'Campo flexível para armazenar dados adicionais de integração.';

-- Indexes to help filtering and reminders
CREATE INDEX IF NOT EXISTS idx_credit_sales_status ON public.credit_sales (status);
CREATE INDEX IF NOT EXISTS idx_credit_sales_due_date ON public.credit_sales (due_date);
CREATE INDEX IF NOT EXISTS idx_credit_sales_deleted_at ON public.credit_sales (deleted_at);

