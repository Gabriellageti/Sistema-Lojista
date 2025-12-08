-- Add deleted_at column to cash_sessions table
ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_at column to service_orders table
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index on deleted_at for better query performance
CREATE INDEX IF NOT EXISTS idx_cash_sessions_deleted_at ON public.cash_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_service_orders_deleted_at ON public.service_orders(deleted_at);