-- Players are the people who can sign in.
--
-- Before this, players were a free-standing list you typed into. Now every row
-- in app_members gets a player row, created and renamed automatically, and the
-- app has no way to add one: creating a login is what puts someone on the
-- board. Rows that predate this migration are adopted by name rather than
-- duplicated, so existing match history keeps pointing at the same player.

alter table public.players
  add column member_email text
    references public.app_members (email) on update cascade on delete set null;

-- One player per member. NULLs stay distinct, which leaves room for any legacy
-- player who never had a login of their own.
create unique index players_member_email_unique on public.players (member_email);

comment on column public.players.member_email is
  'The allowlist row this player is, kept in step by ensure_member_player(). NULL only for players who predate the members-are-players rule.';

-- The name a member plays under: their display name, or the part of their email
-- before the @ when they have none.
create function public.member_player_name(p_email text, p_display_name text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(btrim(p_display_name), ''), split_part(p_email, '@', 1));
$$;

-- Create or update the player row for one member. Idempotent, and the single
-- place that decides what a member's player row looks like -- the trigger below
-- and the backfill at the bottom both go through it.
create function public.ensure_member_player(p_email text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text := public.member_player_name(p_email, p_display_name);
  v_player_id uuid;
begin
  select id into v_player_id from public.players where member_email = p_email;

  -- Not linked yet: adopt a player of the same name instead of creating a second
  -- one. This is what carries seeded rows -- and their match history -- across.
  if v_player_id is null then
    select id into v_player_id
      from public.players
     where member_email is null
       and lower(name) = lower(v_name)
     limit 1;
  end if;

  -- Player names are unique case-insensitively. If someone else already answers
  -- to this one, fall back to the email so provisioning can never fail.
  if exists (
    select 1
      from public.players
     where lower(name) = lower(v_name)
       and (v_player_id is null or id <> v_player_id)
  ) then
    v_name := p_email;
  end if;

  if v_player_id is null then
    insert into public.players (name, member_email)
    values (v_name, p_email)
    returning id into v_player_id;
  else
    update public.players
       set name = v_name,
           member_email = p_email,
           -- Adopting an old row brings it back; a plain rename leaves whatever
           -- the Players page last set.
           is_active = case when member_email is null then true else is_active end
     where id = v_player_id;
  end if;

  return v_player_id;
end;
$$;

-- Postgres grants execute on a new function to PUBLIC, and PostgREST exposes
-- anything in this schema as an RPC. This one is security definer and writes to
-- players, so take that default away: only the triggers below may call it.
revoke all on function public.ensure_member_player(text, text) from public;

create function public.sync_member_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_member_player(new.email, new.display_name);
  return new;
end;
$$;

create trigger sync_member_player
  after insert or update of email, display_name on public.app_members
  for each row
  execute function public.sync_member_player();

-- Taking someone off the allowlist must not delete their player row: the
-- matches they played are still part of the season. Hide them from new matches
-- instead, and let the foreign key unlink them.
create function public.retire_member_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players
     set is_active = false
   where member_email = old.email;

  return old;
end;
$$;

create trigger retire_member_player
  before delete on public.app_members
  for each row
  execute function public.retire_member_player();

-- The app can no longer invent a player. Update stays, because the Players page
-- still deactivates and reactivates; insert and delete are the database's job
-- now, driven off app_members.
drop policy "members have full access to players" on public.players;

create policy "members can read players"
  on public.players for select
  to authenticated
  using (public.is_member());

create policy "members can update players"
  on public.players for update
  to authenticated
  using (public.is_member())
  with check (public.is_member());

revoke insert, delete on public.players from authenticated;

revoke all on function public.sync_member_player() from public;
revoke all on function public.retire_member_player() from public;

-- Everyone already on the allowlist gets their player row now.
do $$
declare r record;
begin
  for r in select email, display_name from public.app_members order by email loop
    perform public.ensure_member_player(r.email, r.display_name);
  end loop;
end;
$$;
