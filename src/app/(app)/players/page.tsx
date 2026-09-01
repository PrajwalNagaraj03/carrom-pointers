import { TogglePlayerButton } from "@/components/player-forms";
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
          Everyone who can sign in. A player appears here the moment their login
          is created, so there is nothing to add. Deactivating keeps their
          history and their place in past standings — it only hides them when
          logging new matches.
        </p>
      </div>

      <Card title={`Everyone (${players.length})`}>
        {players.length === 0 ? (
          <EmptyState>No logins yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span className="flex flex-1 flex-col gap-0.5 truncate">
                  <span
                    className={`truncate ${player.is_active ? "font-medium" : "text-muted"}`}
                  >
                    {player.name}
                    {!player.is_active && " · inactive"}
                  </span>
                  {player.member_email && (
                    <span className="truncate text-xs text-muted">
                      {player.member_email}
                    </span>
                  )}
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
