import Link from "next/link";

import { MatchForm } from "@/components/match-form";
import { Card } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { listPlayers, listSeasons } from "@/lib/queries";

export const metadata = { title: "Log a match" };

export default async function NewMatchPage() {
  const { supabase } = await requireMember();
  const [seasons, players] = await Promise.all([
    listSeasons(supabase),
    listPlayers(supabase),
  ]);

  const activeSeason = seasons.find((season) => season.is_active) ?? seasons[0];

  if (!activeSeason) {
    return (
      <Card title="Log a match">
        <div className="px-4 py-8 text-center sm:px-5">
          <p className="text-sm text-muted">Start a season before logging matches.</p>
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Log a match</h1>
      <Card>
        <MatchForm
          seasons={seasons}
          players={players.filter((player) => player.is_active)}
          defaultSeasonId={activeSeason.id}
        />
      </Card>
    </div>
  );
}
