create table public.rentflow_tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  contact text not null default '' check (char_length(contact) <= 150 and contact = btrim(contact)),
  address text not null default '' check (char_length(address) <= 300 and address = btrim(address)),
  created_at timestamptz not null default now(),
  unique (user_id, name, contact, address)
);
-- The unique index also supports owner-scoped listing and auth-user deletion.
alter table public.rentflow_tenants enable row level security;
revoke all on public.rentflow_tenants from public, anon, authenticated;
grant select, insert, update, delete on public.rentflow_tenants to authenticated;
create policy rentflow_tenants_owner on public.rentflow_tenants
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
