-- Add items column to credit_sales for storing sale line items
ALTER TABLE public.credit_sales
  ADD COLUMN IF NOT EXISTS items jsonb;

-- Ensure items defaults to an empty array to avoid null JSON serialization issues
ALTER TABLE public.credit_sales
  ALTER COLUMN items SET DEFAULT '[]'::jsonb;

-- Backfill existing rows with a single item derived from the sale description/total
UPDATE public.credit_sales
SET items = jsonb_build_array(
    jsonb_build_object(
      'description', COALESCE(description, 'Item'),
      'quantity', 1,
      'unitPrice', COALESCE(total, 0),
      'total', COALESCE(total, 0)
    )
  )
WHERE items IS NULL;
