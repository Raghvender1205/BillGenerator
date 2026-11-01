alter table public.rentflow_charge_rates
  add column mode text not null default 'per_unit' check (mode in ('per_unit', 'fixed')),
  add column enabled boolean not null default true;

create table public.rentflow_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed_at timestamptz not null default now()
);
alter table public.rentflow_profiles enable row level security;
revoke all on public.rentflow_profiles from public, anon;
grant select, insert, update on public.rentflow_profiles to authenticated;
create policy rentflow_profiles_owner on public.rentflow_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Save the complete selection atomically; unchecked charges are kept disabled.
create function public.rentflow_save_charge_preferences(p_charges jsonb)
returns setof public.rentflow_charge_rates
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); row_data jsonb; row_id uuid;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_charges) is distinct from 'array' or jsonb_array_length(p_charges) > 50 then
    raise exception 'Invalid charge preferences';
  end if;
  update public.rentflow_charge_rates set enabled = false where user_id = owner_id;
  for row_data in select value from jsonb_array_elements(p_charges) loop
    row_id := nullif(row_data->>'id', '')::uuid;
    if row_id is not null then
      update public.rentflow_charge_rates set name = btrim(row_data->>'name'),
        unit = btrim(row_data->>'unit'), rate = (row_data->>'rate')::numeric,
        mode = coalesce(row_data->>'mode', 'per_unit'), enabled = coalesce((row_data->>'enabled')::boolean, true)
        where id = row_id and user_id = owner_id;
      if not found then raise exception 'Saved charge no longer exists' using errcode = 'P0002'; end if;
    else
      insert into public.rentflow_charge_rates(user_id, name, unit, rate, mode, enabled)
        values (owner_id, btrim(row_data->>'name'), btrim(row_data->>'unit'), (row_data->>'rate')::numeric,
          coalesce(row_data->>'mode', 'per_unit'), coalesce((row_data->>'enabled')::boolean, true))
        on conflict (user_id, name) do update set unit = excluded.unit, rate = excluded.rate,
          mode = excluded.mode, enabled = excluded.enabled;
    end if;
  end loop;
  return query select * from public.rentflow_charge_rates where user_id = owner_id order by name;
end;
$$;
revoke all on function public.rentflow_save_charge_preferences(jsonb) from public, anon;
grant execute on function public.rentflow_save_charge_preferences(jsonb) to authenticated;

create function public.rentflow_complete_onboarding(p_landlord jsonb, p_charges jsonb, p_skip boolean)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); landlord_id uuid;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not p_skip then
    if p_landlord is not null and p_landlord <> 'null'::jsonb then
      insert into public.rentflow_landlords(user_id, name, phone)
        values (owner_id, btrim(p_landlord->>'name'), btrim(coalesce(p_landlord->>'phone', '')))
        on conflict (user_id, name, phone) do nothing;
      select id into landlord_id from public.rentflow_landlords
        where user_id = owner_id and name = btrim(p_landlord->>'name') and phone = btrim(coalesce(p_landlord->>'phone', ''));
    end if;
    perform public.rentflow_save_charge_preferences(p_charges);
  end if;
  insert into public.rentflow_profiles(user_id) values (owner_id)
    on conflict (user_id) do update set onboarding_completed_at = now();
  return landlord_id;
end;
$$;
revoke all on function public.rentflow_complete_onboarding(jsonb, jsonb, boolean) from public, anon;
grant execute on function public.rentflow_complete_onboarding(jsonb, jsonb, boolean) to authenticated;
