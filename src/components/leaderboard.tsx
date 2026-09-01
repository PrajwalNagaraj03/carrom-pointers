import { EmptyState } from "@/components/ui";
import type { StandingsRow } from "@/lib/types/database";

/**
 * Ranked by points scored -- that column is the one in bold, so it is obvious
 * what the ordering means. A win is finishing a match on the most points. On
 * narrow screens the table becomes cards rather than something you have to
 * scroll sideways.
 */
export function Leaderboard({ rows }: { rows: StandingsRow[] }) {
  if (rows.length === 0) {
    return <EmptyState>No matches logged in this season yet.</EmptyState>;
  }

  return (
    <>
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-5 py-2.5 text-left font-medium">
              #
            </th>
            <th scope="col" className="px-2 py-2.5 text-left font-medium">
              Player
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">
              Points
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">
              Played
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">
              W–L
            </th>
            <th scope="col" className="px-5 py-2.5 text-right font-medium">
              Best
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.player_id} className="border-b border-border/60 last:border-0">
              <td className="numeric px-5 py-3 text-muted">{index + 1}</td>
              <td className="px-2 py-3 font-medium">{row.player_name}</td>
              <td className="numeric px-2 py-3 text-right text-base font-semibold">
                {row.points_scored}
              </td>
              <td className="numeric px-2 py-3 text-right text-muted">
                {row.matches_played}
              </td>
              <td className="numeric px-2 py-3 text-right text-muted">
                {row.wins}–{row.losses}
                {row.draws > 0 && `–${row.draws}`}
              </td>
              <td className="numeric px-5 py-3 text-right text-muted">
                {row.best_score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border sm:hidden">
        {rows.map((row, index) => (
          <li key={row.player_id} className="flex items-center gap-3 px-4 py-3">
            <span className="numeric w-5 text-sm text-muted">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{row.player_name}</p>
              <p className="numeric text-xs text-muted">
                {row.matches_played} played · {row.wins}–{row.losses} · best{" "}
                {row.best_score}
              </p>
            </div>
            <span className="numeric text-lg font-semibold">{row.points_scored}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
