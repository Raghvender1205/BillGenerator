begin;
insert into auth.users(id, email) values
  ('f966ba62-2470-41d8-a4c4-8503b6fb3201', 'rentflow-e2e-rate-a@example.test'),
  ('f966ba62-2470-41d8-a4c4-8503b6fb3202', 'rentflow-e2e-rate-b@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f966ba62-2470-41d8-a4c4-8503b6fb3201', true);
insert into public.rentflow_charge_rates(user_id, name, unit, rate)
  values ('f966ba62-2470-41d8-a4c4-8503b6fb3201', 'Electricity', 'kWh', 8.5);
do $$
begin
  if (select count(*) from public.rentflow_charge_rates) <> 1 then raise exception 'Owner cannot read rate'; end if;
  begin
    update public.rentflow_charge_rates set user_id = 'f966ba62-2470-41d8-a4c4-8503b6fb3202';
    raise exception 'Ownership reassignment succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', 'f966ba62-2470-41d8-a4c4-8503b6fb3202', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.rentflow_charge_rates) <> 0 then raise exception 'Cross-account rate exposed'; end if;
  update public.rentflow_charge_rates set name = 'Changed';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account update succeeded'; end if;
  delete from public.rentflow_charge_rates;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account delete succeeded'; end if;
  begin
    insert into public.rentflow_charge_rates(user_id, name, unit, rate) values ('f966ba62-2470-41d8-a4c4-8503b6fb3201', 'Injected', 'units', 1);
    raise exception 'Cross-account insert succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  if has_table_privilege('anon', 'public.rentflow_charge_rates', 'SELECT') or
     has_table_privilege('anon', 'public.rentflow_charge_rates', 'INSERT') or
     has_table_privilege('anon', 'public.rentflow_charge_rates', 'UPDATE') or
     has_table_privilege('anon', 'public.rentflow_charge_rates', 'DELETE') then
    raise exception 'Anonymous rate access enabled';
  end if;
end $$;
select 'Saved rate ownership, read/write isolation, and anonymous restrictions passed.' as result;
rollback;
