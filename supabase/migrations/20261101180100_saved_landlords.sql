create table public.rentflow_landlords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  phone text not null default '' check (char_length(phone) <= 40 and phone = btrim(phone)),
  created_at timestamptz not null default now(),
  unique (user_id, name, phone)
);
-- The unique index also supports owner-scoped listing and auth-user deletion.
alter table public.rentflow_landlords enable row level security;
revoke all on public.rentflow_landlords from public, anon;
grant select, insert, update, delete on public.rentflow_landlords to authenticated;
create policy rentflow_landlords_owner on public.rentflow_landlords
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
