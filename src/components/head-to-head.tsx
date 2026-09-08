import { EmptyState } from "@/components/ui";
import type { HeadToHeadRow } from "@/lib/types/database";

/**
 * Each pair's record against each other, one-on-one.
 *
 * Which player the view calls "a" is decided by uuid order, so the pair is put
 * in a readable order here: whoever is ahead goes on the left.
 */
export function HeadToHead({ rows }: { rows: HeadToHeadRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState>
        No one-on-ones yet. Log a match with just two players and the pair
        appears here.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const aLeads = row.player_a_wins >= row.player_b_wins;

        const leader = {
          name: aLeads ? row.player_a_name : row.player_b_name,
          wins: aLeads ? row.player_a_wins : row.player_b_wins,
          points: aLeads ? row.player_a_points : row.player_b_points,
        };
        const other = {
          name: aLeads ? row.player_b_name : row.player_a_name,
          wins: aLeads ? row.player_b_wins : row.player_a_wins,
          points: aLeads ? row.player_b_points : row.player_a_points,
        };

        const level = leader.wins === other.wins;

        return (
          <li
            key={`${row.player_a_id}-${row.player_b_id}`}
            className="px-4 py-3 sm:px-5"
          >
            <div className="flex items-baseline gap-2">
              <span
                className={`min-w-0 flex-1 truncate ${level ? "" : "font-semibold"}`}
              >
                {leader.name}
              </span>
              <span className="numeric shrink-0 text-base font-semibold">
                {leader.wins}
                <span className="mx-1 font-normal text-muted">–</span>
                {other.wins}
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-muted">
                {other.name}
              </span>
            </div>
            <p className="numeric mt-1 text-xs text-muted">
              {row.matches_played} {row.matches_played === 1 ? "match" : "matches"}
              {row.draws > 0 && ` · ${row.draws} drawn`} · {leader.points}–
              {other.points} points
            </p>
          </li>
        );
      })}
    </ul>
  );
}
