create table public.rentflow_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  number text not null check (length(number) between 1 and 50),
  invoice jsonb not null check (jsonb_typeof(invoice) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);
create index rentflow_invoices_recent on public.rentflow_invoices(user_id, updated_at desc, id desc);
alter table public.rentflow_invoices enable row level security;
revoke all on public.rentflow_invoices from anon;
grant select, insert, update on public.rentflow_invoices to authenticated;
create policy rentflow_invoices_owner on public.rentflow_invoices for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
