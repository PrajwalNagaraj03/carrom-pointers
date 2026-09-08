"use client";

import { useActionState } from "react";

import { Button, Field, FormError, inputBaseClass, inputClass } from "@/components/ui";
import { updateMatch } from "@/lib/actions/matches";
import { initialActionState } from "@/lib/actions/shared";
import type { MatchWithPlayers } from "@/lib/types/database";

/** The stored timestamp as the yyyy-mm-dd the date input wants, in local time. */
function asDateInput(iso: string): string {
  const at = new Date(iso);
  return new Date(at.getTime() - at.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function EditMatchForm({ match }: { match: MatchWithPlayers }) {
  const [state, action, pending] = useActionState(updateMatch, initialActionState);

  // Highest first, the same order the match reads in on the dashboard.
  const roster = [...match.match_players].sort((a, b) => b.points - a.points);

  return (
    <form action={action} className="flex flex-col gap-5 p-4 sm:p-5">
      <FormError message={state.error} />

      {state.savedAt && !state.error && (
        <p
          role="status"
          className="rounded-lg border border-positive/40 bg-positive/10 px-3 py-2 text-sm text-positive"
        >
          Saved. The standings have already caught up.
        </p>
      )}

      <input type="hidden" name="match_id" value={match.id} />

      <Field label="Match name" hint="Optional — clear it to leave the match unnamed.">
        <input
          type="text"
          name="name"
          maxLength={60}
          defaultValue={match.name ?? ""}
          placeholder="Untitled match"
          className={inputClass}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          Points
          <span className="ml-2 text-xs font-normal text-muted">
            who played is fixed
          </span>
        </legend>

        {roster.map((entry) => {
          const player = entry.players;
          if (!player) return null;

          return (
            <div
              key={player.id}
              className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              {/* The action reads the roster off these, exactly as the log form does. */}
              <input type="hidden" name="player_id" value={player.id} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {player.name}
              </span>
              <input
                type="number"
                name={`points_${player.id}`}
                min={-999}
                max={999}
                step={1}
                required
                defaultValue={entry.points}
                aria-label={`Points for ${player.name}`}
                className={`${inputBaseClass} numeric w-24 shrink-0 text-right`}
              />
            </div>
          );
        })}

        <p className="text-xs text-muted">
          Ticked the wrong person? A match has to be deleted and logged again —
          and only an admin can delete one.
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Played on">
          <input
            type="date"
            name="played_on"
            defaultValue={asDateInput(match.played_at)}
            className={inputClass}
          />
        </Field>
        <Field label="Note" hint="Optional.">
          <input
            type="text"
            name="notes"
            maxLength={200}
            defaultValue={match.notes ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save correction"}
        </Button>
      </div>
    </form>
  );
}
