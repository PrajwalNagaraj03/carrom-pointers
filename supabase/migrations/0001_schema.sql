-- Carrom dashboard: core tables.
--
-- Shape of the data: a season holds many matches; a match has two sides (A and B)
-- with a board score each; match_players says who played on which side. Singles
-- puts one player per side, doubles puts two. Standings are never stored -- they
-- are derived from matches by the season_standings view (0002).

create extension if not exists pgcrypto;

-- The access list. Three rows, edited in the Supabase dashboard, never from the
-- app. Everything else in this schema hangs off membership in this table.
create table public.app_members (
  email text primary key,
  display_name text,
  created_at timestamptz not null default now(),
  constraint app_members_email_is_lowercase check (email = lower(email)),
  constraint app_members_email_looks_like_email check (email like '_%@_%._%')
);

comment on table public.app_members is
  'Allowlist of email addresses permitted to sign in. Managed out-of-band; the app only reads it.';

-- Players are deliberately separate from auth.users: you can track someone who
-- plays every week but never signs in.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint players_name_not_blank check (length(btrim(name)) > 0)
);

-- Case-insensitive uniqueness: "Prajwal" and "prajwal" are the same person.
create unique index players_name_unique on public.players (lower(name));

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_on date not null default current_date,
  ended_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint seasons_name_not_blank check (length(btrim(name)) > 0),
  constraint seasons_dates_ordered check (ended_on is null or ended_on >= started_on),
  constraint seasons_closed_has_end_date check (is_active or ended_on is not null)
);

create unique index seasons_name_unique on public.seasons (lower(name));

-- At most one season is current at a time; closing one is what lets you open the next.
create unique index seasons_single_active on public.seasons (is_active) where is_active;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  played_at timestamptz not null default now(),
  format text not null,
  side_a_score integer not null,
  side_b_score integer not null,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint matches_format_known check (format in ('singles', 'doubles')),
  constraint matches_side_a_score_in_range check (side_a_score between 0 and 100),
  constraint matches_side_b_score_in_range check (side_b_score between 0 and 100)
);

create index matches_season_played_at_idx on public.matches (season_id, played_at desc);

-- One row per player per match. The composite primary key is what stops the same
-- player being listed on both sides of a board.
create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  side text not null,
  primary key (match_id, player_id),
  constraint match_players_side_known check (side in ('A', 'B'))
);

create index match_players_player_idx on public.match_players (player_id);

-- Guards direct inserts (the SQL editor, a stray script) against over-filling a
-- side. Under-filling can only be judged once the whole match is written, which
-- is why matches are created through public.create_match() in 0004.
create function public.enforce_match_roster_size()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_match_id uuid := coalesce(new.match_id, old.match_id);
  v_allowed integer;
  v_side text;
  v_count integer;
begin
  select case format when 'singles' then 1 else 2 end
    into v_allowed
    from public.matches
   where id = v_match_id;

  if v_allowed is null then
    return coalesce(new, old);
  end if;

  foreach v_side in array array['A', 'B'] loop
    select count(*) into v_count
      from public.match_players
     where match_id = v_match_id and side = v_side;

    if v_count > v_allowed then
      raise exception 'side % of match % has % players, at most % allowed',
        v_side, v_match_id, v_count, v_allowed
        using errcode = 'check_violation';
    end if;
  end loop;

  return coalesce(new, old);
end;
$$;

create constraint trigger match_players_roster_size
  after insert or update on public.match_players
  for each row
  execute function public.enforce_match_roster_size();
