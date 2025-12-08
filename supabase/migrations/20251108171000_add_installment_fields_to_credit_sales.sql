-- Add installment tracking fields to credit_sales
ALTER TABLE public.credit_sales
  ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_value numeric(12, 2),
  ADD COLUMN IF NOT EXISTS amount_paid numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount numeric(12, 2) NOT NULL DEFAULT 0;

-- Backfill existing records to ensure consistency
UPDATE public.credit_sales
SET
  installments = GREATEST(COALESCE(NULLIF(installments, 0), 1), 1),
  amount_paid = COALESCE(amount_paid, 0),
  remaining_amount = GREATEST(COALESCE(total, 0) - COALESCE(amount_paid, 0), 0),
  installment_value = CASE
    WHEN COALESCE(total, 0) > 0 THEN
      ROUND(
        COALESCE(total, 0)
        / GREATEST(COALESCE(NULLIF(installments, 0), 1), 1),
        2
      )
    ELSE NULL
  END;

-- Ensure remaining amount follows total and amount_paid
CREATE OR REPLACE FUNCTION public.set_credit_sales_remaining_amount()
RETURNS trigger AS $$
DECLARE
  effective_installments integer;
BEGIN
  -- guarantee installments >= 1
  effective_installments := GREATEST(COALESCE(NULLIF(NEW.installments, 0), 1), 1);
  NEW.installments := effective_installments;

  IF NEW.amount_paid IS NULL THEN
    NEW.amount_paid := 0;
  END IF;

  -- recalculate installment_value when total or installments change
  IF NEW.installment_value IS NULL
     OR (TG_OP = 'UPDATE'
         AND (OLD.installments IS DISTINCT FROM NEW.installments
              OR OLD.total IS DISTINCT FROM NEW.total)) THEN
    IF NEW.total IS NOT NULL THEN
      NEW.installment_value := ROUND(NEW.total / effective_installments, 2);
    ELSE
      NEW.installment_value := NULL;
    END IF;
  END IF;

  -- remaining = total - paid, never negative
  NEW.remaining_amount := GREATEST(
    COALESCE(NEW.total, 0) - COALESCE(NEW.amount_paid, 0),
    0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_credit_sales_remaining_amount'
  ) THEN
    CREATE TRIGGER set_credit_sales_remaining_amount
    BEFORE INSERT OR UPDATE ON public.credit_sales
    FOR EACH ROW
    EXECUTE FUNCTION public.set_credit_sales_remaining_amount();
  END IF;
END;
$$;

-- Ensure updated_at column stays in sync on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_credit_sales_updated_at'
  ) THEN
    CREATE TRIGGER update_credit_sales_updated_at
    BEFORE UPDATE ON public.credit_sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    -- helper not available in this environment, ignore
    NULL;
END;
$$;
