-- A match can carry a name.
--
-- Optional, and free text: "Friday decider", "office tournament round 2". The
-- note field is for what happened; this is what to call the match in a list.

alter table public.matches
  add column name text,
  add constraint matches_name_not_blank check (name is null or length(btrim(name)) > 0);

comment on column public.matches.name is
  'What to call this match in a list. Null when it is just another board.';

-- Adding a parameter makes a new function rather than replacing the old one,
-- and two create_match overloads would leave PostgREST guessing which you meant.
drop function public.create_match(uuid, uuid[], integer[], timestamptz, text);

create function public.create_match(
  p_season_id uuid,
  p_players uuid[],
  p_points integer[],
  p_played_at timestamptz default now(),
  p_notes text default null,
  p_name text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_players integer := coalesce(array_length(p_players, 1), 0);
  v_match_id uuid;
begin
  if v_players < 2 or v_players > 3 then
    raise exception 'a match has 2 or 3 players, got %', v_players
      using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_points, 1), 0) <> v_players then
    raise exception 'every player needs a score'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from unnest(p_players) as roster(player_id)
    group by roster.player_id having count(*) > 1
  ) then
    raise exception 'a player cannot appear twice in the same match'
      using errcode = 'check_violation';
  end if;

  insert into public.matches (season_id, played_at, name, notes, created_by)
  values (
    p_season_id,
    coalesce(p_played_at, now()),
    nullif(btrim(coalesce(p_name, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning id into v_match_id;

  insert into public.match_players (match_id, player_id, points)
  select v_match_id, roster.player_id, roster.points
    from unnest(p_players, p_points) as roster(player_id, points);

  return v_match_id;
end;
$$;

grant execute on function public.create_match(uuid, uuid[], integer[], timestamptz, text, text)
  to authenticated;
