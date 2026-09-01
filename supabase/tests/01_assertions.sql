-- Exercises the schema the way the app and an attacker would. Run via
-- scripts/test-db.sh. Any failed assertion aborts with ON_ERROR_STOP.

\set ON_ERROR_STOP on
\set MEMBER_JWT '{"sub":"11111111-1111-1111-1111-111111111111","email":"member@example.com","role":"authenticated"}'
\set OUTSIDER_JWT '{"sub":"22222222-2222-2222-2222-222222222222","email":"outsider@example.com","role":"authenticated"}'

-- ---------------------------------------------------------------- allowlist --
insert into public.app_members (email, display_name) values ('member@example.com', 'Member');
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'member@example.com');

\echo '== joining the allowlist creates the player'
do $$
declare r record;
begin
  select * into r from public.players where member_email = 'member@example.com';
  assert found, 'FAIL: no player was created for the new member';
  assert r.name = 'Member', format('FAIL: player should be named after display_name, got %s', r.name);
  assert r.is_active, 'FAIL: a new member should start active';
end;
$$;

\echo '== a member with no display name plays under the local part of their email'
insert into public.app_members (email) values ('nameless@example.com');
do $$
begin
  assert exists (select 1 from public.players where member_email = 'nameless@example.com' and name = 'nameless'),
    'FAIL: expected a player named after the email local part';
end;
$$;

\echo '== renaming a member renames their player'
update public.app_members set display_name = 'Nameless' where email = 'nameless@example.com';
do $$
begin
  assert exists (select 1 from public.players where member_email = 'nameless@example.com' and name = 'Nameless'),
    'FAIL: the player was not renamed with the member';
  assert (select count(*) from public.players where member_email = 'nameless@example.com') = 1,
    'FAIL: renaming a member created a second player';
end;
$$;

\echo '== leaving the allowlist keeps the player but hides them from new matches'
delete from public.app_members where email = 'nameless@example.com';
do $$
declare r record;
begin
  select * into r from public.players where name = 'Nameless';
  assert found, 'FAIL: removing a member deleted their player and their history with it';
  assert not r.is_active, 'FAIL: a removed member should be deactivated';
  assert r.member_email is null, 'FAIL: the player should have been unlinked from the allowlist';
end;
$$;

\echo '== an existing player of the same name is adopted, not duplicated'
begin;
insert into public.players (id, name) values ('cccccccc-0000-0000-0000-000000000001', 'Legacy');
insert into public.app_members (email, display_name) values ('legacy@example.com', 'Legacy');
do $$
begin
  assert (select count(*) from public.players where lower(name) = 'legacy') = 1,
    'FAIL: a second Legacy player was created instead of adopting the first';
  assert exists (
    select 1 from public.players
     where id = 'cccccccc-0000-0000-0000-000000000001'
       and member_email = 'legacy@example.com'
  ), 'FAIL: the existing player was not linked to the member';
end;
$$;
rollback;

\echo '== signup gate rejects an email that is not on the access list'
do $$
begin
  begin
    insert into auth.users (email) values ('gatecrasher@example.com');
    raise exception 'FAIL: signup trigger let an unlisted email through';
  exception
    when insufficient_privilege then
      raise notice 'ok: unlisted signup rejected';
  end;
end;
$$;

\echo '== an allowlisted signup succeeds'
insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'member@example.com')
  on conflict (email) do nothing;

-- ------------------------------------------------------------- member writes --
-- Players come from the allowlist now, so this is how four of them appear.
insert into public.app_members (email, display_name) values
  ('ana@example.com',    'Ana'),
  ('bala@example.com',   'Bala'),
  ('chetan@example.com', 'Chetan'),
  ('divya@example.com',  'Divya');

-- Player ids are looked up by name throughout. psql variables would be terser
-- but they do not survive into a dollar-quoted do block, and half of what
-- follows is inside one.

\echo '== a member can set up a season and log matches'
begin;
set local role authenticated;
set local request.jwt.claims = :'MEMBER_JWT';

insert into public.seasons (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Season 1');

-- two of them: Ana 25, Bala 12
select public.create_match(
  'aaaaaaaa-0000-0000-0000-000000000001',
  array[(select id from public.players where name = 'Ana'),
        (select id from public.players where name = 'Bala')],
  array[25, 12]);

-- three of them, tied at the top: Ana 21, Bala 25, Chetan 25
select public.create_match(
  'aaaaaaaa-0000-0000-0000-000000000001',
  array[(select id from public.players where name = 'Ana'),
        (select id from public.players where name = 'Bala'),
        (select id from public.players where name = 'Chetan')],
  array[21, 25, 25]);

do $$
declare v_created_by uuid;
begin
  select created_by into v_created_by from public.matches limit 1;
  assert v_created_by = '11111111-1111-1111-1111-111111111111',
    'FAIL: created_by should be stamped from auth.uid()';
end;
$$;
commit;

-- ------------------------------------------------------------ standings math --
\echo '== standings add up and rank by points scored'
begin;
set local role authenticated;
set local request.jwt.claims = :'MEMBER_JWT';

do $$
declare r record;
begin
  -- Ana: won the first (25), lost the second (21).
  select * into r from public.season_standings where player_name = 'Ana';
  assert r.matches_played = 2, format('FAIL: Ana played %s, expected 2', r.matches_played);
  assert r.wins = 1 and r.draws = 0 and r.losses = 1,
    format('FAIL: Ana W/D/L was %s/%s/%s', r.wins, r.draws, r.losses);
  assert r.points_scored = 46, format('FAIL: Ana scored %s, expected 46', r.points_scored);
  assert r.best_score = 25, format('FAIL: Ana best was %s, expected 25', r.best_score);

  -- Bala: lost the first (12), tied Chetan at the top of the second (25).
  select * into r from public.season_standings where player_name = 'Bala';
  assert r.matches_played = 2 and r.wins = 0 and r.draws = 1 and r.losses = 1,
    format('FAIL: Bala W/D/L was %s/%s/%s', r.wins, r.draws, r.losses);
  assert r.points_scored = 37, format('FAIL: Bala scored %s, expected 37', r.points_scored);

  -- Chetan: one match, tied at the top of it.
  select * into r from public.season_standings where player_name = 'Chetan';
  assert r.matches_played = 1 and r.wins = 0 and r.draws = 1 and r.losses = 0,
    format('FAIL: Chetan W/D/L was %s/%s/%s', r.wins, r.draws, r.losses);
  assert r.points_scored = 25, format('FAIL: Chetan scored %s, expected 25', r.points_scored);

  -- Divya sat both out, so she is not on the table at all.
  assert not exists (select 1 from public.season_standings where player_name = 'Divya'),
    'FAIL: a player who has not played should not appear in the standings';
end;
$$;

do $$
declare v_leader text;
begin
  select player_name into v_leader
    from public.season_standings
   order by points_scored desc, wins desc, best_score desc
   limit 1;
  assert v_leader = 'Ana', format('FAIL: leader was %s, expected Ana', v_leader);
end;
$$;
commit;

-- ------------------------------------------------------- create_match guards --
\echo '== create_match refuses malformed rosters, and takes a negative score'
begin;
set local role authenticated;
set local request.jwt.claims = :'MEMBER_JWT';

do $$
declare v_match uuid;
begin
  begin
    perform public.create_match(
      'aaaaaaaa-0000-0000-0000-000000000001',
      array[(select id from public.players where name = 'Ana')],
      array[25]);
    raise exception 'FAIL: a one-player match was accepted';
  exception when check_violation then raise notice 'ok: two players minimum enforced';
  end;

  begin
    perform public.create_match(
      'aaaaaaaa-0000-0000-0000-000000000001',
      array[(select id from public.players where name = 'Ana'),
            (select id from public.players where name = 'Bala'),
            (select id from public.players where name = 'Chetan'),
            (select id from public.players where name = 'Divya')],
      array[25, 10, 8, 4]);
    raise exception 'FAIL: a four-player match was accepted';
  exception when check_violation then raise notice 'ok: three players maximum enforced';
  end;

  begin
    perform public.create_match(
      'aaaaaaaa-0000-0000-0000-000000000001',
      array[(select id from public.players where name = 'Ana'),
            (select id from public.players where name = 'Bala')],
      array[25]);
    raise exception 'FAIL: a match with a missing score was accepted';
  exception when check_violation then raise notice 'ok: every player needs a score';
  end;

  begin
    perform public.create_match(
      'aaaaaaaa-0000-0000-0000-000000000001',
      array[(select id from public.players where name = 'Ana'),
            (select id from public.players where name = 'Ana')],
      array[25, 10]);
    raise exception 'FAIL: the same player was accepted twice';
  exception when check_violation then raise notice 'ok: duplicate player rejected';
  end;

  -- A negative score is legal: a bad board can cost you points.
  v_match := public.create_match(
    'aaaaaaaa-0000-0000-0000-000000000001',
    array[(select id from public.players where name = 'Ana'),
          (select id from public.players where name = 'Bala')],
    array[-5, 10]);

  assert (
    select points from public.match_players
     where match_id = v_match
       and player_id = (select id from public.players where name = 'Ana')
  ) = -5, 'FAIL: a negative score was not stored';

  begin
    perform public.create_match(
      'aaaaaaaa-0000-0000-0000-000000000001',
      array[(select id from public.players where name = 'Ana'),
            (select id from public.players where name = 'Bala')],
      array[-1000, 10]);
    raise exception 'FAIL: a score past the floor was accepted';
  exception when check_violation then raise notice 'ok: score range enforced';
  end;
end;
$$;
rollback;

\echo '== only one season can be active at a time'
begin;
set local role authenticated;
set local request.jwt.claims = :'MEMBER_JWT';
do $$
begin
  begin
    insert into public.seasons (name) values ('Season 2');
    raise exception 'FAIL: a second active season was allowed';
  exception when unique_violation then raise notice 'ok: single active season enforced';
  end;
end;
$$;
rollback;

\echo '== opening a season closes the previous one, and reopening swaps them back'
begin;
set local role authenticated;
set local request.jwt.claims = :'MEMBER_JWT';

do $$
declare
  v_season_2 uuid;
  r record;
begin
  v_season_2 := public.create_season('Season 2', current_date);

  select * into r from public.seasons where name = 'Season 1';
  assert not r.is_active, 'FAIL: Season 1 should have been closed';
  assert r.ended_on is not null, 'FAIL: a closed season needs an end date';

  select * into r from public.seasons where id = v_season_2;
  assert r.is_active and r.ended_on is null, 'FAIL: Season 2 should be active and open';

  -- The old season's matches stay put, and its standings are untouched.
  assert (select count(*) from public.season_standings
           where season_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 3,
    'FAIL: Season 1 standings changed when Season 2 opened';
  assert (select count(*) from public.season_standings where season_id = v_season_2) = 0,
    'FAIL: a brand new season should have empty standings';

  perform public.activate_season('aaaaaaaa-0000-0000-0000-000000000001');
  select * into r from public.seasons where id = v_season_2;
  assert not r.is_active, 'FAIL: Season 2 should have been closed on reactivating Season 1';
  select * into r from public.seasons where name = 'Season 1';
  assert r.is_active and r.ended_on is null, 'FAIL: Season 1 should be active again';

  perform public.close_season('aaaaaaaa-0000-0000-0000-000000000001');
  assert (select count(*) from public.seasons where is_active) = 0,
    'FAIL: closing the last season should leave none active';
end;
$$;
rollback;

\echo '== a member cannot invent a player'
begin;
set local role authenticated;
set local request.jwt.claims = :'MEMBER_JWT';
do $$
begin
  begin
    insert into public.players (name) values ('Ringer');
    raise exception 'FAIL: a member added a player by hand';
  exception when insufficient_privilege then raise notice 'ok: players come from the allowlist only';
  end;

  -- Deactivating still works; it is the one write the Players page makes.
  update public.players set is_active = false where name = 'Divya';
  assert found, 'FAIL: a member should still be able to deactivate a player';
end;
$$;
rollback;

-- -------------------------------------------------------------- RLS: outsider --
\echo '== a signed-in account that is not on the access list sees nothing'
begin;
set local role authenticated;
set local request.jwt.claims = :'OUTSIDER_JWT';

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.matches;
  assert v_count = 0, format('FAIL: outsider read %s matches', v_count);
  select count(*) into v_count from public.players;
  assert v_count = 0, format('FAIL: outsider read %s players', v_count);
  select count(*) into v_count from public.seasons;
  assert v_count = 0, format('FAIL: outsider read %s seasons', v_count);
  select count(*) into v_count from public.season_standings;
  assert v_count = 0, format('FAIL: outsider read %s standings rows', v_count);
  select count(*) into v_count from public.app_members;
  assert v_count = 0, format('FAIL: outsider read %s allowlist rows', v_count);

  begin
    insert into public.players (name) values ('Interloper');
    raise exception 'FAIL: outsider inserted a player';
  exception when insufficient_privilege then raise notice 'ok: outsider write blocked';
  end;
end;
$$;
rollback;

-- ------------------------------------------------------------------ RLS: anon --
\echo '== an anonymous caller sees nothing'
begin;
set local role anon;
do $$
declare v_count integer;
begin
  begin
    select count(*) into v_count from public.matches;
    assert v_count = 0, format('FAIL: anon read %s matches', v_count);
  exception when insufficient_privilege then raise notice 'ok: anon has no table privilege at all';
  end;
end;
$$;
rollback;

\echo '== all assertions passed'
