-- Add CNPJ column to receipt_config table
ALTER TABLE public.receipt_config 
ADD COLUMN cnpj_loja text;