-- Creating a match writes to two tables. PostgREST runs each request in its own
-- transaction, so doing it as two client calls can leave a match with no players
-- behind when the second call fails. This function keeps it atomic and is the
-- only path the app uses.
--
-- security invoker (the default, stated for the avoidance of doubt): the insert
-- runs as the caller, so the RLS policies from 0003 still apply.
create function public.create_match(
  p_season_id uuid,
  p_format text,
  p_side_a uuid[],
  p_side_b uuid[],
  p_side_a_score integer,
  p_side_b_score integer,
  p_played_at timestamptz default now(),
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_per_side integer;
  v_match_id uuid;
begin
  v_per_side := case p_format when 'singles' then 1 when 'doubles' then 2 end;

  if v_per_side is null then
    raise exception 'unknown match format %', p_format using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_side_a, 1), 0) <> v_per_side
     or coalesce(array_length(p_side_b, 1), 0) <> v_per_side then
    raise exception 'a % match needs exactly % player(s) on each side', p_format, v_per_side
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from unnest(p_side_a || p_side_b) as roster(player_id)
    group by roster.player_id having count(*) > 1
  ) then
    raise exception 'a player cannot appear twice in the same match'
      using errcode = 'check_violation';
  end if;

  insert into public.matches (
    season_id, played_at, format, side_a_score, side_b_score, notes, created_by
  )
  values (
    p_season_id,
    coalesce(p_played_at, now()),
    p_format,
    p_side_a_score,
    p_side_b_score,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning id into v_match_id;

  insert into public.match_players (match_id, player_id, side)
  select v_match_id, roster.player_id, 'A' from unnest(p_side_a) as roster(player_id)
  union all
  select v_match_id, roster.player_id, 'B' from unnest(p_side_b) as roster(player_id);

  return v_match_id;
end;
$$;

grant execute on function public.create_match(uuid, text, uuid[], uuid[], integer, integer, timestamptz, text)
  to authenticated;

-- Opening a season closes the one before it. Both halves in one transaction so
-- you can never end up with the old season closed and the new one missing --
-- or, worse, with two active seasons and the unique index blocking every write.
create function public.create_season(
  p_name text,
  p_started_on date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_started_on date := coalesce(p_started_on, current_date);
  v_season_id uuid;
begin
  update public.seasons
     set is_active = false,
         ended_on = coalesce(ended_on, greatest(started_on, v_started_on))
   where is_active;

  insert into public.seasons (name, started_on, is_active)
  values (btrim(p_name), v_started_on, true)
  returning id into v_season_id;

  return v_season_id;
end;
$$;

-- Make an older season current again, closing whichever one is current now.
create function public.activate_season(p_season_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.seasons
     set is_active = false,
         ended_on = coalesce(ended_on, greatest(started_on, current_date))
   where is_active and id <> p_season_id;

  update public.seasons
     set is_active = true,
         ended_on = null
   where id = p_season_id;

  if not found then
    raise exception 'season % not found', p_season_id using errcode = 'no_data_found';
  end if;
end;
$$;

-- Closing a season leaves none current, which is fine -- the dashboard then asks
-- you to start the next one.
create function public.close_season(p_season_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.seasons
     set is_active = false,
         ended_on = coalesce(ended_on, greatest(started_on, current_date))
   where id = p_season_id;

  if not found then
    raise exception 'season % not found', p_season_id using errcode = 'no_data_found';
  end if;
end;
$$;

grant execute on function public.create_season(text, date) to authenticated;
grant execute on function public.activate_season(uuid) to authenticated;
grant execute on function public.close_season(uuid) to authenticated;
