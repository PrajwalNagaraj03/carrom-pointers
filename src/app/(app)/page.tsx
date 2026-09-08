import Link from "next/link";

import { BOARD_CAPTIONS, BoardTabs } from "@/components/board-tabs";
import { HeadToHead } from "@/components/head-to-head";
import { Leaderboard } from "@/components/leaderboard";
import { MatchList } from "@/components/match-list";
import { Card, EmptyState } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import {
  countMatches,
  getActiveSeason,
  getHeadToHead,
  getStandings,
  getStandingsForBoard,
  listMatches,
} from "@/lib/queries";
import { isBoardView } from "@/lib/types/database";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { supabase, member } = await requireMember();
  const { board } = await searchParams;
  const view = isBoardView(board) ? board : "all";
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

  const [standings, shown, duels, matches, total] = await Promise.all([
    // The tiles always describe the whole season, whichever board is on screen.
    getStandings(supabase, season.id),
    getStandingsForBoard(supabase, season.id, view),
    getHeadToHead(supabase, season.id),
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
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:min-h-9"
        >
          Log a match
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Matches" value={total} />
        <Stat label="Players" value={standings.length} />
        <Stat label="Board points" value={boardPoints} />
        {/* A name needs the full width on a phone, or it truncates to "Prajwal Nag…". */}
        <Stat label="Leader" value={standings[0]?.player_name ?? "—"} wide />
      </div>

      <Card
        title={
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Leaderboard
          </h2>
        }
        action={<BoardTabs basePath="/" current={view} />}
      >
        <p className="border-b border-border px-4 py-2 text-xs text-muted sm:px-5">
          {BOARD_CAPTIONS[view]} Ranked by points scored.
        </p>
        <Leaderboard rows={shown} />
      </Card>

      <Card title="Head to head">
        <HeadToHead rows={duels} />
      </Card>

      <Card
        title="Recent matches"
        action={
          <Link
            href={`/seasons/${season.id}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline sm:min-h-0"
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

function Stat({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface px-4 py-3 ${
        wide ? "order-first col-span-2 sm:order-none sm:col-span-1" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="numeric mt-1 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}
