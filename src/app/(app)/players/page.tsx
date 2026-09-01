import { AddPlayerForm, TogglePlayerButton } from "@/components/player-forms";
import { Card, EmptyState } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { listPlayers } from "@/lib/queries";

export const metadata = { title: "Players" };

export default async function PlayersPage() {
  const { supabase } = await requireMember();
  const players = await listPlayers(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
        <p className="mt-1 text-sm text-muted">
          Anyone who plays, whether or not they can sign in. Deactivating keeps
          their history and their place in past standings — it only hides them
          when logging new matches.
        </p>
      </div>

      <Card title="Add a player">
        <AddPlayerForm />
      </Card>

      <Card title={`Everyone (${players.length})`}>
        {players.length === 0 ? (
          <EmptyState>No players yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span
                  className={`flex-1 truncate ${player.is_active ? "font-medium" : "text-muted"}`}
                >
                  {player.name}
                  {!player.is_active && " · inactive"}
                </span>
                <TogglePlayerButton playerId={player.id} isActive={player.is_active} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
