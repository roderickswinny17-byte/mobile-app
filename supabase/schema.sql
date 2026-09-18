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
