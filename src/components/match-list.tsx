import { EmptyState } from "@/components/ui";
import { DeleteMatchButton } from "@/components/delete-match-button";
import type { MatchWithPlayers, MatchSide } from "@/lib/types/database";

function namesOn(match: MatchWithPlayers, side: MatchSide): string {
  const names = match.match_players
    .filter((entry) => entry.side === side)
    .map((entry) => entry.players?.name ?? "Unknown")
    .sort((a, b) => a.localeCompare(b));

  return names.length > 0 ? names.join(" & ") : "—";
}

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
        const aWon = match.side_a_score > match.side_b_score;
        const bWon = match.side_b_score > match.side_a_score;

        return (
          <li key={match.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={aWon ? "font-semibold" : "text-muted"}>
                  {namesOn(match, "A")}
                </span>
                <span className="numeric text-sm text-muted">
                  {match.side_a_score}–{match.side_b_score}
                </span>
                <span className={bWon ? "font-semibold" : "text-muted"}>
                  {namesOn(match, "B")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {dayFormat.format(new Date(match.played_at))} · {match.format}
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
