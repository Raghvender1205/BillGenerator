-- All users, counters, and drafts created here are rolled back.
begin;
insert into auth.users(id, email) values
 ('d580d4ef-ffce-4ede-bb64-771c924b0a01', 'rentflow-rls-a@example.test'),
 ('d580d4ef-ffce-4ede-bb64-771c924b0a02', 'rentflow-rls-b@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd580d4ef-ffce-4ede-bb64-771c924b0a01', true);
do $$
declare first_invoice text; second_invoice text;
begin
  select invoice->>'number' into first_invoice from public.rentflow_new_invoice('2026-11-01');
  select invoice->>'number' into second_invoice from public.rentflow_new_invoice('2026-11-01');
  if first_invoice <> 'INV-202611-001' or second_invoice <> 'INV-202611-002' then raise exception 'Monthly sequence failed'; end if;
end $$;
insert into public.rentflow_invoices(user_id, number, invoice) select user_id, invoice->>'number', invoice from public.rentflow_drafts;
select set_config('request.jwt.claim.sub', 'd580d4ef-ffce-4ede-bb64-771c924b0a02', true);
do $$
declare invoice_number text; changed_rows integer;
begin
  if (select count(*) from public.rentflow_invoices) <> 0 then raise exception 'Cross-account history exposed'; end if;
  if (select count(*) from public.rentflow_drafts) <> 0 then raise exception 'Cross-account draft exposed'; end if;
  if (select count(*) from public.rentflow_invoice_counters) <> 0 then raise exception 'Cross-account counter exposed'; end if;
  select invoice->>'number' into invoice_number from public.rentflow_new_invoice('2026-11-01');
  if invoice_number <> 'INV-202611-001' then raise exception 'Counters are not per account'; end if;
  update public.rentflow_drafts set revision = revision + 1 where user_id = 'd580d4ef-ffce-4ede-bb64-771c924b0a01';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'Cross-account update succeeded'; end if;
  begin
    update public.rentflow_drafts set user_id = 'd580d4ef-ffce-4ede-bb64-771c924b0a01';
    raise exception 'Ownership reassignment succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  if has_table_privilege('anon', 'public.rentflow_invoices', 'SELECT') then raise exception 'Anonymous history access enabled'; end if;
  if has_table_privilege('anon', 'public.rentflow_drafts', 'SELECT') then raise exception 'Anonymous draft access enabled'; end if;
  if has_function_privilege('anon', 'public.rentflow_new_invoice(date)', 'EXECUTE') then raise exception 'Anonymous numbering enabled'; end if;
end $$;
select 'Draft/history account isolation, ownership checks, anonymous restrictions, and monthly sequences passed.' as result;
rollback;
