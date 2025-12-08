-- Add service_order_id column to transactions table to link transactions to service orders
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS service_order_id UUID;

-- Add foreign key constraint
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_service_orders 
FOREIGN KEY (service_order_id) 
REFERENCES public.service_orders(id)
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_service_order_id 
ON public.transactions(service_order_id);