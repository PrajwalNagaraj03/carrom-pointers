import Link from "next/link";
import { notFound } from "next/navigation";

import { BOARD_CAPTIONS, BoardTabs } from "@/components/board-tabs";
import { HeadToHead } from "@/components/head-to-head";
import { Leaderboard } from "@/components/leaderboard";
import { MatchList } from "@/components/match-list";
import { Badge, Card } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { getHeadToHead, getSeason, getStandingsForBoard, listMatches } from "@/lib/queries";
import { isBoardView } from "@/lib/types/database";

export default async function SeasonPage({
  params,
  searchParams,
}: PageProps<"/seasons/[seasonId]">) {
  const { seasonId } = await params;
  const { board } = await searchParams;
  const view = isBoardView(board) ? board : "all";
  const { supabase, member } = await requireMember();

  const season = await getSeason(supabase, seasonId);
  if (!season) {
    notFound();
  }

  const [standings, duels, matches] = await Promise.all([
    getStandingsForBoard(supabase, season.id, view),
    getHeadToHead(supabase, season.id),
    listMatches(supabase, season.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/seasons" className="text-sm text-muted hover:text-foreground">
          ← All seasons
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{season.name}</h1>
          {season.is_active ? (
            <Badge tone="active">Current</Badge>
          ) : (
            <Badge>Closed</Badge>
          )}
        </div>
      </div>

      <Card
        title="Leaderboard"
        action={<BoardTabs basePath={`/seasons/${season.id}`} current={view} />}
      >
        <p className="border-b border-border px-4 py-2 text-xs text-muted sm:px-5">
          {BOARD_CAPTIONS[view]} Ranked by points scored.
        </p>
        <Leaderboard rows={standings} />
      </Card>

      <Card title="Head to head">
        <HeadToHead rows={duels} />
      </Card>

      <Card title={`Matches (${matches.length})`}>
        <MatchList matches={matches} showDelete={member.is_admin} />
      </Card>
    </div>
  );
}
