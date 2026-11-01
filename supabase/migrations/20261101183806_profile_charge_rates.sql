create table public.rentflow_charge_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  unit text not null check (char_length(unit) between 1 and 24 and unit = btrim(unit)),
  rate numeric(14,4) not null check (rate >= 0 and rate <= 1000000),
  unique (user_id, name)
);
alter table public.rentflow_charge_rates enable row level security;
revoke all on public.rentflow_charge_rates from public, anon;
grant select, insert, update, delete on public.rentflow_charge_rates to authenticated;
create policy rentflow_charge_rates_owner on public.rentflow_charge_rates
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
