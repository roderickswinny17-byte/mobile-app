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

-- Phone number, added for the profile info popover. Nullable because
-- existing users won't have one yet. No RLS change needed: RLS is
-- row-level, not column-level, so the existing "Users can view/update
-- their own profile" policies on public.profiles already cover it.
alter table public.profiles add column if not exists phone_number text;

-- Song library: a shared catalog (not per-user data), browsable by mood
-- category and taggable by language. Read-only for authenticated clients --
-- writes happen only via the Dashboard / a trusted admin process for now,
-- matching the "clients read, trusted server writes" posture already used
-- for public.subscriptions above.
--
-- Adding a new category later (e.g. "breakup") also requires updating the
-- check constraint below:
--   alter table public.songs drop constraint songs_category_check;
--   alter table public.songs add constraint songs_category_check
--     check (category in ('happy', 'sad', 'love', 'party', 'breakup'));
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  category text not null check (category in ('happy', 'sad', 'love', 'party')),
  language text not null check (language in ('english', 'hindi', 'telugu', 'tamil', 'malayalam')),
  audio_url text not null,
  cover_url text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;

-- Shared catalog, no owner column -- any signed-in user can browse it.
drop policy if exists "Authenticated users can view songs" on public.songs;
create policy "Authenticated users can view songs"
  on public.songs for select
  to authenticated
  using (true);

revoke insert, update, delete on public.songs from authenticated, anon;

-- ---------------------------------------------------------------------
-- Placeholder seed data. These are NOT real licensed catalog songs -- they
-- reuse the well-known "SoundHelix" freely-licensed instrumental test mp3s
-- (commonly used exactly for exercising audio pipelines end-to-end), tagged
-- with fabricated title/artist/category/language metadata so the
-- category -> song list -> playback flow can be built and tested. Replace
-- with real, rights-cleared catalog audio + metadata before shipping.
insert into public.songs (title, artist, category, language, audio_url)
values
  ('Happy Sample (English)',    'Placeholder Artist', 'happy', 'english',    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('Happy Sample (Hindi)',      'Placeholder Artist', 'happy', 'hindi',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('Happy Sample (Telugu)',     'Placeholder Artist', 'happy', 'telugu',     'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('Happy Sample (Tamil)',      'Placeholder Artist', 'happy', 'tamil',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
  ('Happy Sample (Malayalam)',  'Placeholder Artist', 'happy', 'malayalam',  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('Sad Sample (English)',      'Placeholder Artist', 'sad',   'english',    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('Sad Sample (Hindi)',        'Placeholder Artist', 'sad',   'hindi',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('Sad Sample (Telugu)',       'Placeholder Artist', 'sad',   'telugu',     'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
  ('Sad Sample (Tamil)',        'Placeholder Artist', 'sad',   'tamil',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('Sad Sample (Malayalam)',    'Placeholder Artist', 'sad',   'malayalam',  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('Love Sample (English)',     'Placeholder Artist', 'love',  'english',    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('Love Sample (Hindi)',       'Placeholder Artist', 'love',  'hindi',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
  ('Love Sample (Telugu)',      'Placeholder Artist', 'love',  'telugu',     'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('Love Sample (Tamil)',       'Placeholder Artist', 'love',  'tamil',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('Love Sample (Malayalam)',   'Placeholder Artist', 'love',  'malayalam',  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('Party Sample (English)',    'Placeholder Artist', 'party', 'english',    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
  ('Party Sample (Hindi)',      'Placeholder Artist', 'party', 'hindi',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
  ('Party Sample (Telugu)',     'Placeholder Artist', 'party', 'telugu',     'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
  ('Party Sample (Tamil)',      'Placeholder Artist', 'party', 'tamil',      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
  ('Party Sample (Malayalam)',  'Placeholder Artist', 'party', 'malayalam',  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3')
on conflict do nothing;
