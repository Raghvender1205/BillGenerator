-- Every row belongs to one verified Supabase Auth user. No anonymous access.
create table public.rentflow_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invoice jsonb not null check (jsonb_typeof(invoice) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.rentflow_invoice_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{6}$'),
  last_value bigint not null check (last_value > 0),
  primary key (user_id, month)
);
alter table public.rentflow_drafts enable row level security;
alter table public.rentflow_invoice_counters enable row level security;
revoke all on public.rentflow_drafts, public.rentflow_invoice_counters from anon;
grant select, insert, update, delete on public.rentflow_drafts to authenticated;
grant select, insert, update on public.rentflow_invoice_counters to authenticated;
create policy rentflow_drafts_owner on public.rentflow_drafts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy rentflow_counters_owner on public.rentflow_invoice_counters for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- This runs as the caller and remains subject to RLS. Counter allocation and
-- draft creation commit together, including concurrent requests across devices.
create function public.rentflow_new_invoice(p_due date)
returns setof public.rentflow_drafts
language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  invoice_month text;
  sequence_number bigint;
  previous_invoice jsonb;
  new_invoice jsonb;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_due is null or extract(day from p_due) <> 1 then raise exception 'A new invoice starts on the first of the month'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select invoice into previous_invoice from public.rentflow_drafts where user_id = owner_id;
  invoice_month := to_char(p_due, 'YYYYMM');
  insert into public.rentflow_invoice_counters(user_id, month, last_value)
    values (owner_id, invoice_month, 1)
    on conflict (user_id, month) do update
      set last_value = public.rentflow_invoice_counters.last_value + 1
    returning last_value into sequence_number;
  new_invoice := jsonb_build_object(
    'number', 'INV-' || invoice_month || '-' || lpad(sequence_number::text, greatest(3, length(sequence_number::text)), '0'),
    'due', p_due::text,
    'landlord', coalesce(previous_invoice->'landlord', '{"name":"","phone":""}'::jsonb),
    'tenant', coalesce(previous_invoice->'tenant', '{"name":"","address":"","contact":""}'::jsonb),
    'items', '[{"id":"rent","title":"Monthly rent","amount":"","type":"regular"}]'::jsonb
  );
  return query insert into public.rentflow_drafts(user_id, invoice) values (owner_id, new_invoice)
    on conflict (user_id) do update
      set invoice = excluded.invoice, revision = public.rentflow_drafts.revision + 1, updated_at = now()
    returning *;
end;
$$;
revoke all on function public.rentflow_new_invoice(date) from public, anon;
grant execute on function public.rentflow_new_invoice(date) to authenticated;
