-- Add items column to credit_sales table
ALTER TABLE public.credit_sales 
ADD COLUMN items jsonb;