create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  email_domain text generated always as (split_part(lower(email), '@', 2)) stored,
  name text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz,
  constraint user_profiles_email_nonempty check (char_length(trim(email)) > 0),
  constraint user_profiles_name_length check (name is null or char_length(name) between 1 and 10)
);

create unique index if not exists user_profiles_email_lower_uidx
  on public.user_profiles (lower(email));

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_user_profiles_updated_at'
  ) then
    create trigger set_user_profiles_updated_at
    before update on public.user_profiles
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

create table if not exists public.app_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  session_token_hash text not null unique,
  csrf_token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by_session_id uuid references public.app_sessions (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  constraint app_sessions_expiry_future check (expires_at > created_at)
);

create index if not exists app_sessions_user_id_idx
  on public.app_sessions (user_id);

create index if not exists app_sessions_expires_at_idx
  on public.app_sessions (expires_at);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_app_sessions_updated_at'
  ) then
    create trigger set_app_sessions_updated_at
    before update on public.app_sessions
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

create table if not exists public.places (
  id uuid primary key default extensions.gen_random_uuid(),
  naver_place_id text not null,
  naver_place_url text not null,
  name text not null,
  road_address text not null,
  land_lot_address text,
  latitude double precision not null,
  longitude double precision not null,
  place_type text not null,
  zeropay_status text not null,
  created_by_user_id uuid not null references public.user_profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  normalized_name text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  normalized_road_address text generated always as (lower(regexp_replace(btrim(road_address), '\s+', ' ', 'g'))) stored,
  constraint places_place_type_check check (place_type in ('restaurant', 'cafe')),
  constraint places_zeropay_status_check check (zeropay_status in ('available', 'unavailable', 'needs_verification'))
);

create unique index if not exists places_naver_place_id_uidx
  on public.places (naver_place_id);

create unique index if not exists places_normalized_name_road_address_uidx
  on public.places (normalized_name, normalized_road_address);

create index if not exists places_created_by_user_id_idx
  on public.places (created_by_user_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_places_updated_at'
  ) then
    create trigger set_places_updated_at
    before update on public.places
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

create table if not exists public.place_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  author_user_id uuid not null references public.user_profiles (id) on delete cascade,
  rating_score smallint not null,
  content text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint place_reviews_rating_score_check check (rating_score between 1 and 5),
  constraint place_reviews_content_length_check check (char_length(content) <= 500)
);

create unique index if not exists place_reviews_place_author_uidx
  on public.place_reviews (place_id, author_user_id);

create index if not exists place_reviews_author_user_id_idx
  on public.place_reviews (author_user_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_place_reviews_updated_at'
  ) then
    create trigger set_place_reviews_updated_at
    before update on public.place_reviews
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;
