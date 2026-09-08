-- Correcting a match after the fact.
--
-- Someone writes 12 when they meant 21, and until now the only way back was to
-- delete the match and log it again -- which only an admin can do, so the person
-- who made the typo usually could not fix it.
--
-- 0008 already reserved deleting and left "members can correct matches" in
-- place; this is the function that uses it.
--
-- The roster is deliberately fixed. Dropping a player from a match means
-- deleting a match_players row, and that is an admin's to do -- so if the wrong
-- person was ticked, the match still has to be deleted and logged again. Scores,
-- name, date and note are everyone's to correct.
create function public.update_match(
  p_match_id uuid,
  p_players uuid[],
  p_points integer[],
  p_played_at timestamptz default null,
  p_name text default null,
  p_notes text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_roster uuid[];
  v_asked uuid[];
  v_updated integer;
begin
  if coalesce(array_length(p_players, 1), 0) <> coalesce(array_length(p_points, 1), 0) then
    raise exception 'every player needs a score' using errcode = 'check_violation';
  end if;

  select array_agg(player_id order by player_id) into v_roster
    from public.match_players
   where match_id = p_match_id;

  -- Null here means the match does not exist, or RLS is hiding it. Either way
  -- there is nothing this caller may correct.
  if v_roster is null then
    raise exception 'match % not found', p_match_id using errcode = 'no_data_found';
  end if;

  select array_agg(player_id order by player_id) into v_asked
    from unnest(p_players) as t(player_id);

  if v_asked is distinct from v_roster then
    raise exception 'who played cannot be changed here -- delete the match and log it again'
      using errcode = 'check_violation';
  end if;

  update public.match_players mp
     set points = correction.points
    from unnest(p_players, p_points) as correction(player_id, points)
   where mp.match_id = p_match_id
     and mp.player_id = correction.player_id;

  get diagnostics v_updated = row_count;

  -- A policy that refuses an update does not raise; it just matches no rows.
  -- Counting them is what makes that audible instead of a silent no-op.
  if v_updated <> array_length(p_players, 1) then
    raise exception 'that match is not yours to correct'
      using errcode = 'insufficient_privilege';
  end if;

  update public.matches
     set played_at = coalesce(p_played_at, played_at),
         name = nullif(btrim(coalesce(p_name, '')), ''),
         notes = nullif(btrim(coalesce(p_notes, '')), '')
   where id = p_match_id;
end;
$$;

grant execute on function public.update_match(uuid, uuid[], integer[], timestamptz, text, text)
  to authenticated;
