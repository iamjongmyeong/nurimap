alter table public.user_profiles enable row level security;
alter table public.app_sessions enable row level security;
alter table public.places enable row level security;
alter table public.place_reviews enable row level security;

revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.app_sessions from anon, authenticated;
revoke all on table public.places from anon, authenticated;
revoke all on table public.place_reviews from anon, authenticated;
