-- This Supabase-created event trigger is for DDL, not a callable Data API.
-- Event-trigger execution continues to work without these public grants.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
