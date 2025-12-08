alter table public.service_orders
  add column if not exists deleted_at timestamptz;

create index if not exists service_orders_deleted_at_idx
  on public.service_orders (deleted_at);
