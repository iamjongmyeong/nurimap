create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon, authenticated;

-- Keep the database `public` schema in place for internal helpers like
-- `public.set_updated_at()`. Later hardening may remove `public` from the
-- exposed PostgREST schema list without dropping the schema itself.
alter table if exists public.user_profiles set schema app_private;
alter table if exists public.app_sessions set schema app_private;
alter table if exists public.places set schema app_private;
alter table if exists public.place_reviews set schema app_private;
