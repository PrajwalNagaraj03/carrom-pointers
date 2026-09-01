-- Row level security, plus the signup gate.
--
-- Two independent locks:
--   1. enforce_member_signup() stops a non-allowlisted Google account from ever
--      becoming a user in the first place.
--   2. the policies below mean that even a valid session with an unlisted email
--      sees nothing and can write nothing.

-- Is the caller on the access list? security definer so the policies can read
-- app_members without needing a policy of their own on it first.
create function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.app_members am
     where am.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

comment on function public.is_member() is
  'True when the requesting JWT carries an email listed in app_members.';

grant execute on function public.is_member() to authenticated;

alter table public.app_members enable row level security;
alter table public.players enable row level security;
alter table public.seasons enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

-- The allowlist is readable (so the app can greet you by name) but never
-- writable from the app -- add and remove members in the Supabase dashboard.
create policy "members can read the access list"
  on public.app_members for select
  to authenticated
  using (public.is_member());

create policy "members have full access to players"
  on public.players for all
  to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy "members have full access to seasons"
  on public.seasons for all
  to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy "members have full access to matches"
  on public.matches for all
  to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy "members have full access to match players"
  on public.match_players for all
  to authenticated
  using (public.is_member())
  with check (public.is_member());

-- Refuse account creation for anyone not on the access list. Supabase's
-- "Before User Created" auth hook does the same job from the dashboard; this
-- lives in a migration so the rule is version-controlled with the schema.
create function public.enforce_member_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.app_members am
     where am.email = lower(coalesce(new.email, ''))
  ) then
    raise exception 'carrom-dashboard: % is not on the access list', coalesce(new.email, '(no email)')
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger enforce_member_signup
  before insert on auth.users
  for each row
  execute function public.enforce_member_signup();

-- Supabase's default privileges already grant these, but stating them keeps the
-- migration self-sufficient if it is ever applied to a plain Postgres database.
-- RLS still gates every one of them.
grant usage on schema public to authenticated;
grant select on public.app_members to authenticated;
grant select, insert, update, delete
  on public.players, public.seasons, public.matches, public.match_players
  to authenticated;
