import Link from "next/link";
import { notFound } from "next/navigation";

import { EditMatchForm } from "@/components/edit-match-form";
import { Card } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { getMatch } from "@/lib/queries";

export const metadata = { title: "Correct a match" };

export default async function EditMatchPage({
  params,
}: PageProps<"/matches/[matchId]/edit">) {
  const { matchId } = await params;
  const { supabase } = await requireMember();

  const match = await getMatch(supabase, matchId);
  if (!match) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {match.name ?? "Correct a match"}
        </h1>
      </div>

      <Card>
        <EditMatchForm match={match} />
      </Card>
    </div>
  );
}
