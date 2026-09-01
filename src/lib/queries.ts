import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, MatchWithPlayers, Player, Season, StandingsRow } from "@/lib/types/database";

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
 * The leaderboard. Ranked by board points scored, with point difference and then
 * wins breaking ties -- two players on the same points should not swap places
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
    .order("point_diff", { ascending: false })
    .order("wins", { ascending: false })
    .order("player_name", { ascending: true });

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
    .select("*, match_players(side, players(id, name))")
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
