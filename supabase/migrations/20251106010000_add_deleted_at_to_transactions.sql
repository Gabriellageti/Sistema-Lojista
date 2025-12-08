-- Add soft delete support to transactions
alter table public.transactions
  add column if not exists deleted_at timestamptz;
create index if not exists transactions_deleted_at_idx
  on public.transactions (deleted_at);
