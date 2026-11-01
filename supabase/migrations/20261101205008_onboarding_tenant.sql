-- Keep the existing completion function available for older clients.
-- Tenant, landlord, charges and completion are saved in one transaction.
create function public.rentflow_complete_onboarding_with_tenant(
  p_landlord jsonb, p_tenant jsonb, p_charges jsonb, p_skip boolean
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); tenant_id uuid; landlord_id uuid;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_skip is null then raise exception 'Invalid skip choice'; end if;
  if not p_skip and p_tenant is not null and p_tenant <> 'null'::jsonb then
    if jsonb_typeof(p_tenant) is distinct from 'object'
      or jsonb_typeof(p_tenant->'name') is distinct from 'string'
      or (p_tenant ? 'contact' and jsonb_typeof(p_tenant->'contact') is distinct from 'string')
      or (p_tenant ? 'address' and jsonb_typeof(p_tenant->'address') is distinct from 'string') then
      raise exception 'Invalid tenant details';
    end if;
    insert into public.rentflow_tenants(user_id, name, contact, address)
      values (owner_id, btrim(p_tenant->>'name'), btrim(coalesce(p_tenant->>'contact', '')),
        btrim(coalesce(p_tenant->>'address', '')))
      on conflict (user_id, name, contact, address) do nothing;
    select id into tenant_id from public.rentflow_tenants
      where user_id = owner_id and name = btrim(p_tenant->>'name')
        and contact = btrim(coalesce(p_tenant->>'contact', ''))
        and address = btrim(coalesce(p_tenant->>'address', ''));
  end if;
  landlord_id := public.rentflow_complete_onboarding(p_landlord, p_charges, p_skip);
  return jsonb_build_object('landlord_id', landlord_id, 'tenant_id', tenant_id);
end;
$$;
revoke all on function public.rentflow_complete_onboarding_with_tenant(jsonb, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.rentflow_complete_onboarding_with_tenant(jsonb, jsonb, jsonb, boolean) to authenticated;
