import Link from "next/link";

import { SeasonStateButton, NewSeasonForm } from "@/components/season-forms";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { listSeasons } from "@/lib/queries";

export const metadata = { title: "Seasons" };

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function SeasonsPage() {
  const { supabase } = await requireMember();
  const seasons = await listSeasons(supabase);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Seasons</h1>

      <Card title="Start a new season">
        <NewSeasonForm />
      </Card>

      <Card title="All seasons">
        {seasons.length === 0 ? (
          <EmptyState>No seasons yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {seasons.map((season) => (
              <li
                key={season.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/seasons/${season.id}`}
                      className="font-medium hover:text-accent hover:underline"
                    >
                      {season.name}
                    </Link>
                    {season.is_active && <Badge tone="active">Current</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {dayFormat.format(new Date(season.started_on))}
                    {season.ended_on
                      ? ` – ${dayFormat.format(new Date(season.ended_on))}`
                      : " – ongoing"}
                  </p>
                </div>
                <SeasonStateButton seasonId={season.id} isActive={season.is_active} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
