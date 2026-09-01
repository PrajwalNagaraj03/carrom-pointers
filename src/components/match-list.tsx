import { EmptyState } from "@/components/ui";
import { DeleteMatchButton } from "@/components/delete-match-button";
import type { MatchWithPlayers } from "@/lib/types/database";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function MatchList({
  matches,
  showDelete = true,
}: {
  matches: MatchWithPlayers[];
  showDelete?: boolean;
}) {
  if (matches.length === 0) {
    return <EmptyState>Nothing logged yet. Your first board goes here.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-border">
      {matches.map((match) => {
        // Highest first, so the match reads as a small result table.
        const scores = [...match.match_players].sort((a, b) => b.points - a.points);
        const best = scores[0]?.points ?? 0;

        return (
          <li key={match.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              {match.name && (
                <p className="mb-1 truncate text-sm font-medium text-accent">
                  {match.name}
                </p>
              )}
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {scores.map((entry, index) => (
                  <span
                    key={entry.players?.id ?? index}
                    className={`flex items-baseline gap-1.5 ${
                      entry.points === best ? "font-semibold" : "text-muted"
                    }`}
                  >
                    <span className="truncate">{entry.players?.name ?? "Unknown"}</span>
                    <span className="numeric">{entry.points}</span>
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                {dayFormat.format(new Date(match.played_at))} · {scores.length} players
                {match.notes && ` · ${match.notes}`}
              </p>
            </div>

            {showDelete && <DeleteMatchButton matchId={match.id} />}
          </li>
        );
      })}
    </ul>
  );
}
