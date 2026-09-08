import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardView,
  Database,
  HeadToHeadRow,
  MatchWithPlayers,
  Player,
  Season,
  StandingsRow,
} from "@/lib/types/database";

type Client = SupabaseClient<Database>;

/** Newest season first, with the current one always at the top. */
export async function listSeasons(supabase: Client): Promise<Season[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("is_active", { ascending: false })
    .order("started_on", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSeason(supabase: Client, seasonId: string): Promise<Season | null> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getActiveSeason(supabase: Client): Promise<Season | null> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listPlayers(supabase: Client): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name");

  if (error) throw error;
  return data ?? [];
}

/**
 * The leaderboard. Ranked by points scored, with wins and then the best single
 * match breaking ties -- two players on the same points should not swap places
 * every time the page reloads.
 */
export async function getStandings(
  supabase: Client,
  seasonId: string,
): Promise<StandingsRow[]> {
  const { data, error } = await supabase
    .from("season_standings")
    .select("*")
    .eq("season_id", seasonId)
    .order("points_scored", { ascending: false })
    .order("wins", { ascending: false })
    .order("best_score", { ascending: false })
    .order("player_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * The same leaderboard for one size of board. "three" is the usual game, "two"
 * the one-on-ones; season_standings_by_size splits them, and the columns match
 * getStandings so one table component renders either.
 */
export async function getStandingsForBoard(
  supabase: Client,
  seasonId: string,
  board: BoardView,
): Promise<StandingsRow[]> {
  if (board === "all") {
    return getStandings(supabase, seasonId);
  }

  const { data, error } = await supabase
    .from("season_standings_by_size")
    .select("*")
    .eq("season_id", seasonId)
    .eq("table_size", board === "three" ? 3 : 2)
    .order("points_scored", { ascending: false })
    .order("wins", { ascending: false })
    .order("best_score", { ascending: false })
    .order("player_name", { ascending: true });

  if (error) throw error;

  // Name the columns rather than spreading around table_size: the two row types
  // stay independent, and adding a column to one view cannot silently leak into
  // the other.
  return (data ?? []).map((row) => ({
    season_id: row.season_id,
    player_id: row.player_id,
    player_name: row.player_name,
    is_active: row.is_active,
    matches_played: row.matches_played,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    points_scored: row.points_scored,
    best_score: row.best_score,
  }));
}

/** Each pair who have played one-on-one, and how that stands. */
export async function getHeadToHead(
  supabase: Client,
  seasonId: string,
): Promise<HeadToHeadRow[]> {
  const { data, error } = await supabase
    .from("season_head_to_head")
    .select("*")
    .eq("season_id", seasonId)
    .order("matches_played", { ascending: false })
    .order("player_a_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listMatches(
  supabase: Client,
  seasonId: string,
  limit?: number,
): Promise<MatchWithPlayers[]> {
  let query = supabase
    .from("matches")
    .select("*, match_players(points, players(id, name))")
    .eq("season_id", seasonId)
    .order("played_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MatchWithPlayers[];
}

export async function countMatches(supabase: Client, seasonId: string): Promise<number> {
  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("season_id", seasonId);

  if (error) throw error;
  return count ?? 0;
}
