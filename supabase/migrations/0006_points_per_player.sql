-- Scoring is per player, not per side.
--
-- We play two or three to a board and write down what each person finished on:
-- "Ganesh 10, Prajwal 20, Amitesh 30". A side A / side B score cannot say that,
-- so the points now live on match_players -- one number per person -- and a
-- match is just when it was played and who was there.
--
-- Existing matches keep their history: each player inherits the score of the
-- side they were on, which is the same number they contributed before.

-- The view reads the columns being dropped, so it goes first and is rebuilt at
-- the bottom.
drop view public.season_standings;

-- ------------------------------------------------------------ match_players --
alter table public.match_players add column points integer;

update public.match_players mp
   set points = case when mp.side = 'A' then m.side_a_score else m.side_b_score end
  from public.matches m
 where m.id = mp.match_id
   and mp.points is null;

alter table public.match_players
  alter column points set not null,
  add constraint match_players_points_in_range check (points between 0 and 999),
  -- match_players_side_known goes with the column it checked.
  drop column side;

comment on column public.match_players.points is
  'What this player finished the match on. Summed across a season, this is the leaderboard.';

-- ------------------------------------------------------------------ matches --
alter table public.matches
  drop column format,
  drop column side_a_score,
  drop column side_b_score;

-- Two or three to a board. Same shape of guard as before -- it catches direct
-- inserts over-filling a match; under-filling can only be judged once the whole
-- match is written, which is what public.create_match() below is for.
create or replace function public.enforce_match_roster_size()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_match_id uuid := coalesce(new.match_id, old.match_id);
  v_count integer;
begin
  select count(*) into v_count
    from public.match_players
   where match_id = v_match_id;

  if v_count > 3 then
    raise exception 'match % has % players, at most 3 allowed', v_match_id, v_count
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------- standings --
-- Winning a match is finishing on the most points. Tie at the top and everyone
-- tied gets a draw rather than a win.
create view public.season_standings
with (security_invoker = on) as
with entries as (
  select
    m.season_id,
    mp.match_id,
    mp.player_id,
    mp.points
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
),
ranked as (
  select
    e.*,
    max(e.points) over (partition by e.match_id) as best_points
  from entries e
),
scored as (
  select
    r.*,
    count(*) filter (where r.points = r.best_points)
      over (partition by r.match_id) as leaders
  from ranked r
)
select
  s.season_id,
  s.player_id,
  p.name as player_name,
  p.is_active,
  count(*)::integer as matches_played,
  count(*) filter (where s.points = s.best_points and s.leaders = 1)::integer as wins,
  count(*) filter (where s.points = s.best_points and s.leaders > 1)::integer as draws,
  count(*) filter (where s.points < s.best_points)::integer as losses,
  coalesce(sum(s.points), 0)::integer as points_scored,
  coalesce(max(s.points), 0)::integer as best_score
from scored s
join public.players p on p.id = s.player_id
group by s.season_id, s.player_id, p.name, p.is_active;

comment on view public.season_standings is
  'Per-season, per-player totals. Ranked by points_scored, then wins. A win is finishing a match on the most points.';

grant select on public.season_standings to authenticated;

-- ------------------------------------------------------------- create_match --
drop function public.create_match(uuid, text, uuid[], uuid[], integer, integer, timestamptz, text);

-- Players and their points, paired by position. Still one function so a match
-- and its scores can never be written half-way.
create function public.create_match(
  p_season_id uuid,
  p_players uuid[],
  p_points integer[],
  p_played_at timestamptz default now(),
  p_notes text default null
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

  insert into public.matches (season_id, played_at, notes, created_by)
  values (
    p_season_id,
    coalesce(p_played_at, now()),
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

grant execute on function public.create_match(uuid, uuid[], integer[], timestamptz, text)
  to authenticated;
