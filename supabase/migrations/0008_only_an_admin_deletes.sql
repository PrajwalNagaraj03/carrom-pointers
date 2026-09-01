-- Deleting a match is not everyone's to do.
--
-- Everyone still logs matches and corrects scores; removing one outright is the
-- one action reserved for whoever keeps the book. That is a flag on the
-- allowlist row rather than an email spelled out in a policy, so it survives
-- someone changing their sign-in address.

alter table public.app_members
  add column is_admin boolean not null default false;

comment on column public.app_members.is_admin is
  'May delete matches. Set it with supabase/scripts/set-admin.sql; everything else is open to every member.';

-- The same shape as is_member(): security definer so a policy can read
-- app_members without needing a policy of its own there first.
create function public.is_admin()
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
       and am.is_admin
  );
$$;

comment on function public.is_admin() is
  'True when the requesting JWT carries an email listed in app_members with is_admin set.';

grant execute on function public.is_admin() to authenticated;

-- A "for all" policy covers delete too, so it has to come apart into the three
-- verbs everyone keeps and the one that is now reserved.
drop policy "members have full access to matches" on public.matches;

create policy "members can read matches"
  on public.matches for select
  to authenticated
  using (public.is_member());

create policy "members can log matches"
  on public.matches for insert
  to authenticated
  with check (public.is_member());

create policy "members can correct matches"
  on public.matches for update
  to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy "only an admin deletes a match"
  on public.matches for delete
  to authenticated
  using (public.is_admin());

-- Same again for the roster, or a match could be gutted a player at a time
-- instead of deleted. Deleting the match itself still takes its rows with it:
-- the cascade runs as a referential action, which RLS does not apply to.
drop policy "members have full access to match players" on public.match_players;

create policy "members can read match players"
  on public.match_players for select
  to authenticated
  using (public.is_member());

create policy "members can log match players"
  on public.match_players for insert
  to authenticated
  with check (public.is_member());

create policy "members can correct match players"
  on public.match_players for update
  to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy "only an admin deletes a match player"
  on public.match_players for delete
  to authenticated
  using (public.is_admin());
