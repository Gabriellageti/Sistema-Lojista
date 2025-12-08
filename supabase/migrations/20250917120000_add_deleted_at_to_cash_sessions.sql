-- Add soft delete support to cash_sessions
alter table public.cash_sessions
  add column if not exists deleted_at timestamptz;

create index if not exists cash_sessions_deleted_at_idx
  on public.cash_sessions (deleted_at);
