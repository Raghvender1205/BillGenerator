-- This Supabase-created event trigger is for DDL, not a callable Data API.
-- Event-trigger execution continues to work without these public grants.
-- Local Supabase does not install the hosted platform's helper.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
