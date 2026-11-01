begin;
insert into auth.users(id, email) values
  ('aa66ba62-2470-41d8-a4c4-8503b6fb3201', 'rentflow-e2e-setup-a@example.test'),
  ('aa66ba62-2470-41d8-a4c4-8503b6fb3202', 'rentflow-e2e-setup-b@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aa66ba62-2470-41d8-a4c4-8503b6fb3201', true);
select public.rentflow_complete_onboarding('{"name":"Setup landlord","phone":"123"}',
  '[{"name":"Electricity","unit":"kWh","rate":"8.5","mode":"per_unit","enabled":true},{"name":"Maintenance","unit":"charge","rate":"500","mode":"fixed","enabled":true}]', false);
do $$
begin
  if (select count(*) from public.rentflow_profiles) <> 1 then raise exception 'Setup completion missing'; end if;
  if (select count(*) from public.rentflow_charge_rates where enabled) <> 2 then raise exception 'Charge selection not saved'; end if;
  if (select count(*) from public.rentflow_landlords) <> 1 then raise exception 'Optional landlord missing'; end if;
  if not exists (select from public.rentflow_charge_rates where name = 'Maintenance' and mode = 'fixed') then raise exception 'Fixed amount missing'; end if;
  begin
    perform public.rentflow_complete_onboarding('{"name":"Must roll back","phone":""}', '[{"name":"Invalid","unit":"units","rate":"-1","mode":"per_unit","enabled":true}]', false);
    raise exception 'Invalid setup succeeded';
  exception when check_violation then null;
  end;
  if exists (select from public.rentflow_landlords where name = 'Must roll back') then raise exception 'Partial setup committed'; end if;
  if (select count(*) from public.rentflow_charge_rates where enabled) <> 2 then raise exception 'Failed setup disabled charges'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'aa66ba62-2470-41d8-a4c4-8503b6fb3202', true);
do $$
begin
  if exists (select from public.rentflow_profiles) or exists (select from public.rentflow_charge_rates) then raise exception 'Another account setup exposed'; end if;
end $$;
select public.rentflow_complete_onboarding(null, '[]', true);
do $$
begin
  if (select count(*) from public.rentflow_profiles) <> 1 then raise exception 'Skip not recorded'; end if;
  if exists (select from public.rentflow_charge_rates) then raise exception 'Skip added charges'; end if;
end $$;
-- Adding a tenant participates in the same atomic save as the other settings.
do $$
begin
  begin
    perform public.rentflow_complete_onboarding_with_tenant(
      '{"name":"Rollback landlord","phone":""}',
      '{"name":"Rollback tenant","contact":"tenant@example.test","address":"Test address"}',
      '[{"name":"Invalid","unit":"units","rate":"-1","mode":"per_unit","enabled":true}]', false);
    raise exception 'Invalid tenant setup succeeded';
  exception when check_violation then null;
  end;
  if exists (select from public.rentflow_tenants) or exists (select from public.rentflow_landlords) then
    raise exception 'Partial tenant setup committed';
  end if;
end $$;
select public.rentflow_complete_onboarding_with_tenant(null,
  '{"name":"Setup tenant","contact":"tenant@example.test","address":"Saved address"}', '[]', false);
select public.rentflow_complete_onboarding_with_tenant(null,
  '{"name":"Setup tenant","contact":"tenant@example.test","address":"Saved address"}', '[]', false);
do $$
begin
  if (select count(*) from public.rentflow_tenants) <> 1 then raise exception 'Tenant missing or duplicate on retry'; end if;
  if not exists (select from public.rentflow_profiles) then raise exception 'Tenant setup completion missing'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'aa66ba62-2470-41d8-a4c4-8503b6fb3201', true);
do $$
begin
  if exists (select from public.rentflow_tenants) then raise exception 'Another account tenant exposed'; end if;
end $$;
select public.rentflow_complete_onboarding_with_tenant(null,
  '{"name":"Skipped tenant","contact":"","address":""}', '[]', true);
do $$
begin
  if exists (select from public.rentflow_tenants) then raise exception 'Skip saved tenant details'; end if;
end $$;
reset role;
do $$
begin
  if has_function_privilege('anon', 'public.rentflow_complete_onboarding(jsonb,jsonb,boolean)', 'EXECUTE') then raise exception 'Anonymous setup allowed'; end if;
  if has_function_privilege('anon', 'public.rentflow_save_charge_preferences(jsonb)', 'EXECUTE') then raise exception 'Anonymous charge changes allowed'; end if;
  if has_function_privilege('anon', 'public.rentflow_complete_onboarding_with_tenant(jsonb,jsonb,jsonb,boolean)', 'EXECUTE') then raise exception 'Anonymous tenant setup allowed'; end if;
  if has_table_privilege('anon', 'public.rentflow_profiles', 'SELECT') then raise exception 'Anonymous profiles exposed'; end if;
end $$;
select 'Onboarding ownership, atomic rollback, fixed charges, and skip behavior passed.' as result;
rollback;
