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

-- Preferred currency for totals (Insights, "X/mo total"). Individual
-- tracked_subscriptions keep whatever currency they're actually billed in;
-- this is only the unit everything gets converted into for aggregate views.
alter table public.profiles add column if not exists home_currency text not null default 'USD';

-- The app dropped its mood/music-player feature -- this app is a
-- subscription tracker now. Drops the table for anyone re-running this
-- script against a database that still has it from before.
drop table if exists public.songs;

-- Tracked subscriptions: a user's own record of external recurring charges
-- (Netflix, Spotify, etc). Unrelated to public.subscriptions above, which is
-- this app's own paid-plan billing -- different concept, same word.
create table if not exists public.tracked_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_name text not null,
  monthly_cost numeric(10,2) not null,
  currency text not null default 'USD',
  billing_cycle text not null check (billing_cycle in ('monthly', 'quarterly', 'yearly')),
  next_renewal_date date,
  category text,
  icon_key text,
  hex text not null default '#DCD3F3',
  billing_url text,
  created_at timestamptz not null default now()
);

alter table public.tracked_subscriptions add column if not exists currency text not null default 'USD';
-- Which bundled logo (assets/icons/, see lib/subscriptionCatalog.ts) to
-- render for this row -- null for a freely-typed app with no matching logo.
alter table public.tracked_subscriptions add column if not exists icon_key text;
-- Row/legend background color -- see lib/subscriptionCatalog.ts, exact
-- values from design-preview/subscriptions-reference.html.
alter table public.tracked_subscriptions add column if not exists hex text not null default '#DCD3F3';
-- Where Pause/Change Plan/Cancel actually send the user -- see
-- lib/subscriptionCatalog.ts for why (no real billing API access).
alter table public.tracked_subscriptions add column if not exists billing_url text;

-- Existing rows predate the 'quarterly' option -- re-add the check
-- constraint to allow it (can't just widen an existing check in place).
alter table public.tracked_subscriptions drop constraint if exists tracked_subscriptions_billing_cycle_check;
alter table public.tracked_subscriptions add constraint tracked_subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'yearly'));

alter table public.tracked_subscriptions enable row level security;

drop policy if exists "Users manage their own tracked subscriptions" on public.tracked_subscriptions;
create policy "Users manage their own tracked subscriptions"
  on public.tracked_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Linked profiles: someone with several accounts (e.g. several emails) on
-- the same phone number can list their *other* profiles to switch between,
-- without a client-side query being able to trawl every user by phone.
-- profiles' own RLS ("Users can view their own profile") already blocks a
-- direct select like this, so it goes through a security-definer function
-- that (a) reads the CALLER's own phone_number server-side, never a
-- client-supplied one, so nobody can pass someone else's number, and
-- (b) never returns anything if that number is null/blank, so two
-- never-set-a-phone accounts don't get accidentally "linked". Only
-- non-sensitive columns are returned -- no password, no auth token, and
-- nothing beyond what this app's own UI already shows for a profile.
-- Dropped first: `create or replace` can't change a `returns table(...)`
-- function's column signature, only `replace`-in-place when it's identical.
drop function if exists public.get_linked_profiles();
create or replace function public.get_linked_profiles()
returns table (id uuid, first_name text, last_name text, email text)
language sql
security definer set search_path = public
stable
as $$
  select p.id, p.first_name, p.last_name, p.email
  from public.profiles p
  where p.phone_number is not null
    and trim(p.phone_number) <> ''
    and p.phone_number = (select phone_number from public.profiles where id = auth.uid())
    and p.id <> auth.uid();
$$;

revoke all on function public.get_linked_profiles() from public;
grant execute on function public.get_linked_profiles() to authenticated;

-- Cross-profile subscription summary: every tracked_subscriptions row for
-- every profile sharing the caller's phone number (including the caller's
-- own), in one call -- lets the app show "what does each of my linked
-- emails have" without switching profiles/re-authenticating for each one.
-- Same security shape as get_linked_profiles(): the phone number being
-- matched against is read server-side from the caller's own row, never
-- client-supplied, and nothing is returned for accounts that never set a
-- phone number.
drop function if exists public.get_linked_subscriptions();
create or replace function public.get_linked_subscriptions()
returns table (
  profile_id uuid,
  profile_name text,
  profile_email text,
  subscription_id uuid,
  service_name text,
  monthly_cost numeric,
  currency text,
  billing_cycle text,
  category text,
  icon_key text,
  hex text
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id as profile_id,
    trim(p.first_name || ' ' || p.last_name) as profile_name,
    p.email as profile_email,
    ts.id as subscription_id,
    ts.service_name,
    ts.monthly_cost,
    ts.currency,
    ts.billing_cycle,
    ts.category,
    ts.icon_key,
    ts.hex
  from public.profiles p
  join public.tracked_subscriptions ts on ts.user_id = p.id
  where p.phone_number is not null
    and trim(p.phone_number) <> ''
    and p.phone_number = (select phone_number from public.profiles where id = auth.uid())
  order by p.first_name, ts.created_at desc;
$$;

revoke all on function public.get_linked_subscriptions() from public;
grant execute on function public.get_linked_subscriptions() to authenticated;

-- ============================================================
-- Gmail subscription scanning
-- ============================================================
-- Requires a Google Cloud OAuth app (Gmail API enabled, gmail.readonly
-- scope) -- see supabase/functions/gmail-oauth-start and
-- supabase/functions/gmail-oauth-callback. Client ID is a public
-- EXPO_PUBLIC_ var; Client Secret is a Supabase Edge Function secret and
-- must never reach the app bundle.

-- oauth_states/email_connections/detected_subscriptions all use
-- create-if-not-exists + alter-add-column-if-not-exists, same pattern as
-- tracked_subscriptions/profiles above -- NOT drop-and-recreate. An earlier
-- version of this script unconditionally dropped these three tables on
-- every run, which silently wiped a user's live Gmail connection and their
-- entire scan/review history any time schema.sql was re-applied for an
-- unrelated column fix elsewhere in this file. Never drop a table here that
-- can hold real user data by the time this script runs again.

-- Short-lived state -> user_id mapping created just before the app opens
-- the Google consent screen, so the callback (which Google hits directly,
-- with no Supabase session of its own) knows which user to attach the
-- resulting tokens to, without trusting a client-supplied user id. Service
-- role only -- no client (authenticated or anon) ever reads or writes this
-- directly, it's exclusively for the two Edge Functions to hand off through.
create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  created_at timestamptz not null default now()
);
alter table public.oauth_states enable row level security;
revoke all on public.oauth_states from authenticated, anon;

-- OAuth tokens -- service role only, by design there is no client-facing
-- policy on this table at all (not even a select-your-own-row one): the
-- access/refresh tokens themselves should never reach the app. Client code
-- instead calls get_email_connection_status()/disconnect_gmail() below,
-- which only ever expose non-token metadata.
create table if not exists public.email_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'gmail',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);
alter table public.email_connections add column if not exists email text;
alter table public.email_connections enable row level security;
revoke all on public.email_connections from authenticated, anon;

drop function if exists public.get_email_connection_status();
create or replace function public.get_email_connection_status()
returns table (provider text, email text, connected_at timestamptz, last_synced_at timestamptz)
language sql
security definer set search_path = public
stable
as $$
  select provider, email, connected_at, last_synced_at
  from public.email_connections
  where user_id = auth.uid();
$$;

revoke all on function public.get_email_connection_status() from public;
grant execute on function public.get_email_connection_status() to authenticated;

create or replace function public.disconnect_gmail()
returns void
language sql
security definer set search_path = public
as $$
  delete from public.email_connections where user_id = auth.uid();
$$;

revoke all on function public.disconnect_gmail() from public;
grant execute on function public.disconnect_gmail() to authenticated;

-- Candidates found by scanning (supabase/functions/gmail-scan-subscriptions)
-- -- a review queue, NOT written straight into tracked_subscriptions, since
-- heuristic detection from receipt emails will sometimes guess wrong. The
-- client promotes an approved row into tracked_subscriptions itself.
-- Client-managed like tracked_subscriptions (own rows only): the Edge
-- Function inserts as service role, but approving/dismissing happens as the
-- signed-in user via ordinary RLS-governed updates.
create table if not exists public.detected_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_name text not null,
  icon_key text,
  guessed_amount numeric(10,2),
  guessed_currency text not null default 'USD',
  source_snippet text,
  gmail_message_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  detected_at timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);
-- What billing cycle the email text seems to describe (monthly/quarterly/
-- yearly) -- previously every Gmail-approved subscription was hardcoded to
-- "monthly" regardless of what the receipt actually said.
alter table public.detected_subscriptions add column if not exists guessed_billing_cycle text not null default 'monthly';
alter table public.detected_subscriptions enable row level security;

drop policy if exists "Users manage their own detected subscriptions" on public.detected_subscriptions;
create policy "Users manage their own detected subscriptions"
  on public.detected_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
