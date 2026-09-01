-- Season standings, derived from matches.
--
-- security_invoker is the important bit: without it the view would run with its
-- owner's rights and hand every row to anyone who can select from it, quietly
-- routing around the RLS policies added in 0003.
create view public.season_standings
with (security_invoker = on) as
with entries as (
  select
    m.season_id,
    mp.player_id,
    case when mp.side = 'A' then m.side_a_score else m.side_b_score end as points_for,
    case when mp.side = 'A' then m.side_b_score else m.side_a_score end as points_against
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
)
select
  e.season_id,
  e.player_id,
  p.name as player_name,
  p.is_active,
  count(*)::integer as matches_played,
  count(*) filter (where e.points_for > e.points_against)::integer as wins,
  count(*) filter (where e.points_for < e.points_against)::integer as losses,
  count(*) filter (where e.points_for = e.points_against)::integer as draws,
  coalesce(sum(e.points_for), 0)::integer as points_scored,
  coalesce(sum(e.points_against), 0)::integer as points_conceded,
  coalesce(sum(e.points_for - e.points_against), 0)::integer as point_diff
from entries e
join public.players p on p.id = e.player_id
group by e.season_id, e.player_id, p.name, p.is_active;

comment on view public.season_standings is
  'Per-season, per-player totals. Ranked by points_scored (board points), then point_diff, then wins.';

grant select on public.season_standings to authenticated;
