-- Tell the three-player board apart from the one-on-ones.
--
-- Three of us round the board is the usual game, but any two can play each
-- other, and those are a different contest: beating one person over 21 points
-- is not the same achievement as coming top of three. Blending them into a
-- single table -- which season_standings does, and still does -- hides that.
--
-- Nothing is dropped. season_standings stays exactly as it was and remains the
-- "everything" view; these two sit beside it.

-- --------------------------------------------------- standings by table size --
-- The same maths as season_standings, split by how many were round the board.
-- A player appears once per size they have played.
create view public.season_standings_by_size
with (security_invoker = on) as
with entries as (
  select
    m.season_id,
    mp.match_id,
    mp.player_id,
    mp.points,
    count(*) over (partition by mp.match_id) as table_size
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
),
ranked as (
  select e.*, max(e.points) over (partition by e.match_id) as best_points
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
  s.table_size::integer as table_size,
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
group by s.season_id, s.table_size, s.player_id, p.name, p.is_active;

comment on view public.season_standings_by_size is
  'season_standings split by how many played the match. table_size 2 is the one-on-ones, 3 the full board.';

-- ---------------------------------------------------------------- head to head --
-- One row per pair who have played each other one-on-one, per season.
--
-- The pair is keyed on the smaller player id so the same two people always land
-- on the same row -- ordering by name would move a pair between rows the moment
-- somebody is renamed. Which of the two is "a" is therefore arbitrary, and the
-- reading order is the caller's to choose.
create view public.season_head_to_head
with (security_invoker = on) as
with duels as (
  select match_id
    from public.match_players
   group by match_id
  having count(*) = 2
),
sides as (
  select
    m.season_id,
    a.player_id as player_a_id,
    b.player_id as player_b_id,
    a.points as a_points,
    b.points as b_points
  from duels d
  join public.match_players a on a.match_id = d.match_id
  join public.match_players b on b.match_id = d.match_id and b.player_id > a.player_id
  join public.matches m on m.id = d.match_id
)
select
  s.season_id,
  s.player_a_id,
  pa.name as player_a_name,
  s.player_b_id,
  pb.name as player_b_name,
  count(*)::integer as matches_played,
  count(*) filter (where s.a_points > s.b_points)::integer as player_a_wins,
  count(*) filter (where s.b_points > s.a_points)::integer as player_b_wins,
  count(*) filter (where s.a_points = s.b_points)::integer as draws,
  coalesce(sum(s.a_points), 0)::integer as player_a_points,
  coalesce(sum(s.b_points), 0)::integer as player_b_points
from sides s
join public.players pa on pa.id = s.player_a_id
join public.players pb on pb.id = s.player_b_id
group by s.season_id, s.player_a_id, pa.name, s.player_b_id, pb.name;

comment on view public.season_head_to_head is
  'Per season, each pair who have played one-on-one: their record against each other and the points each has taken off the other. Two-player matches only.';

grant select on public.season_standings_by_size to authenticated;
grant select on public.season_head_to_head to authenticated;
