-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Security model:
--   * auth.users (email + password hash) is never exposed to the client API
--     by Supabase itself, regardless of anything below. Only visible to you
--     via the Dashboard, or to trusted server code holding the service_role
--     key -- which must never ship inside the app.
--   * public.profiles (first/last name, email) IS reachable through the
--     client API, so row-level security below restricts every user to
--     reading/updating only their own row. No user can see another user's
--     details, and no client role can insert/delete rows directly.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user can read only their own row.
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Each user can update only their own row, and cannot reassign it to
-- someone else's id.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policies are defined on purpose: regular users should
-- never write these rows directly. Row creation happens only via the
-- trigger below, which runs as `security definer` (elevated, trusted).

-- Belt-and-suspenders: strip insert/delete grants from client-facing roles
-- entirely, so this can't be bypassed even by a future policy mistake.
revoke insert, delete on public.profiles from authenticated, anon;

-- Auto-create a profile row whenever a new auth user signs up.
-- Defensive on purpose: if this insert ever failed uncaught, Postgres would
-- roll back the whole transaction -- including the auth.users row itself --
-- and signUp() would fail with "Database error saving new user". coalesce()
-- avoids a not-null violation if metadata is ever missing, and the exception
-- handler makes sure a profile hiccup can never block account creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email
  );
  return new;
exception
  when others then
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Subscriptions: written only by the confirm-subscription Edge Function
-- (service role), after it re-verifies payment with Stripe directly. The
-- client never asserts "I paid" straight into this table.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due')),
  stripe_customer_id text,
  stripe_subscription_id text,
  card_brand text,
  card_last4 text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.subscriptions from authenticated, anon;

alter table public.profiles add column if not exists phone_number text;

-- Songs: a shared catalog (not per-user data), tagged by mood/language so the
-- home screen's mood tiles can filter into a list. Populated by
-- scripts/seed-songs.mjs (service role) -- the client only ever reads it.
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  language text not null,  -- 'en' | 'hi' | 'te' | 'ta' | 'ml'
  mood text not null,      -- 'happy' | 'sad' | 'love' | 'party' | ... (extensible)
  audio_url text not null,
  cover_url text,
  duration_seconds integer,
  source text not null default 'jamendo',
  license_url text,
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;

drop policy if exists "Signed-in users can browse songs" on public.songs;
create policy "Signed-in users can browse songs"
  on public.songs for select
  using (auth.role() = 'authenticated');

revoke insert, update, delete on public.songs from authenticated, anon;

-- Tracked subscriptions: a user's own record of external recurring charges
-- (Netflix, Spotify, etc). Unrelated to public.subscriptions above, which is
-- this app's own paid-plan billing -- different concept, same word.
create table if not exists public.tracked_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_name text not null,
  monthly_cost numeric(10,2) not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  next_renewal_date date,
  category text,
  created_at timestamptz not null default now()
);

alter table public.tracked_subscriptions enable row level security;

drop policy if exists "Users manage their own tracked subscriptions" on public.tracked_subscriptions;
create policy "Users manage their own tracked subscriptions"
  on public.tracked_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
