import Link from "next/link";
import { notFound } from "next/navigation";

import { HeadToHead } from "@/components/head-to-head";
import { MatchList } from "@/components/match-list";
import { SeasonBoards } from "@/components/season-boards";
import { Badge, Card } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import {
  getHeadToHead,
  getSeason,
  getStandings,
  getStandingsBySize,
  listMatches,
} from "@/lib/queries";

export default async function SeasonPage({ params }: PageProps<"/seasons/[seasonId]">) {
  const { seasonId } = await params;
  const { supabase, member } = await requireMember();

  const season = await getSeason(supabase, seasonId);
  if (!season) {
    notFound();
  }

  const [standings, bySize, duels, matches] = await Promise.all([
    getStandings(supabase, season.id),
    getStandingsBySize(supabase, season.id),
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

      <SeasonBoards all={standings} bySize={bySize} />

      <Card title="Head to head">
        <HeadToHead rows={duels} />
      </Card>

      <Card title={`Matches (${matches.length})`}>
        <MatchList matches={matches} showDelete={member.is_admin} />
      </Card>
    </div>
  );
}
