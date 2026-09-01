import Link from "next/link";

import { Leaderboard } from "@/components/leaderboard";
import { MatchList } from "@/components/match-list";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { countMatches, getActiveSeason, getStandings, listMatches } from "@/lib/queries";

export default async function DashboardPage() {
  const { supabase, member } = await requireMember();
  const season = await getActiveSeason(supabase);

  if (!season) {
    return (
      <Card title="No season running">
        <div className="px-4 py-8 text-center sm:px-5">
          <p className="text-sm text-muted">
            Start a season and the leaderboard appears here.
          </p>
          <Link
            href="/seasons"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Go to seasons
          </Link>
        </div>
      </Card>
    );
  }

  const [standings, matches, total] = await Promise.all([
    getStandings(supabase, season.id),
    listMatches(supabase, season.id, 8),
    countMatches(supabase, season.id),
  ]);

  const boardPoints = standings.reduce((sum, row) => sum + row.points_scored, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{season.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Since {new Date(season.started_on).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/matches/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Log a match
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Matches" value={total} />
        <Stat label="Players" value={standings.length} />
        <Stat label="Board points" value={boardPoints} />
        <Stat label="Leader" value={standings[0]?.player_name ?? "—"} />
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Leaderboard
            </h2>
            <Badge tone="active">by points scored</Badge>
          </div>
        }
      >
        <Leaderboard rows={standings} />
      </Card>

      <Card
        title="Recent matches"
        action={
          <Link
            href={`/seasons/${season.id}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            See all {total > 0 ? total : ""}
          </Link>
        }
      >
        {matches.length === 0 ? (
          <EmptyState>Nothing logged yet. Your first board goes here.</EmptyState>
        ) : (
          <MatchList matches={matches} showDelete={member.is_admin} />
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="numeric mt-1 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}
