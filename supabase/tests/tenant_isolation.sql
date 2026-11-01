begin;
insert into auth.users(id, email) values
  ('eb66ba62-2470-41d8-a4c4-8503b6fb3201', 'rentflow-e2e-tenant-a@example.test'),
  ('eb66ba62-2470-41d8-a4c4-8503b6fb3202', 'rentflow-e2e-tenant-b@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'eb66ba62-2470-41d8-a4c4-8503b6fb3201', true);
insert into public.rentflow_tenants(user_id, name, contact)
  values ('eb66ba62-2470-41d8-a4c4-8503b6fb3201', 'Private tenant', '123');
do $$
begin
  if (select count(*) from public.rentflow_tenants) <> 1 then raise exception 'Owner cannot read tenant'; end if;
  begin
    update public.rentflow_tenants set user_id = 'eb66ba62-2470-41d8-a4c4-8503b6fb3202';
    raise exception 'Ownership reassignment succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', 'eb66ba62-2470-41d8-a4c4-8503b6fb3202', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.rentflow_tenants) <> 0 then raise exception 'Cross-account tenant exposed'; end if;
  update public.rentflow_tenants set name = 'Changed';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account update succeeded'; end if;
  delete from public.rentflow_tenants;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account delete succeeded'; end if;
  begin
    insert into public.rentflow_tenants(user_id, name) values ('eb66ba62-2470-41d8-a4c4-8503b6fb3201', 'Injected');
    raise exception 'Cross-account insert succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  if has_table_privilege('anon', 'public.rentflow_tenants', 'SELECT') or
     has_table_privilege('anon', 'public.rentflow_tenants', 'INSERT') or
     has_table_privilege('anon', 'public.rentflow_tenants', 'UPDATE') or
     has_table_privilege('anon', 'public.rentflow_tenants', 'DELETE') then
    raise exception 'Anonymous tenant access enabled';
  end if;
end $$;
select 'Saved tenant ownership, read/write isolation, and anonymous restrictions passed.' as result;
rollback;
