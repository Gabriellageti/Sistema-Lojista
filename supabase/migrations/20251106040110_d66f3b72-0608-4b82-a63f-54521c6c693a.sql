-- Add deleted_at column to transactions table for soft delete support
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create index for better performance on deleted_at queries
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at 
ON public.transactions(deleted_at);

-- Add comment to explain the column
COMMENT ON COLUMN public.transactions.deleted_at IS 'Timestamp when the transaction was soft deleted. NULL means the transaction is active.';