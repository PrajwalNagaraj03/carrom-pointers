"use client";

import { useActionState, useState } from "react";

import { Button, Field, FormError, inputBaseClass, inputClass } from "@/components/ui";
import { logMatch } from "@/lib/actions/matches";
import { initialActionState } from "@/lib/actions/shared";
import type { Player, Season } from "@/lib/types/database";

function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function MatchForm({
  seasons,
  players,
  defaultSeasonId,
}: {
  seasons: Season[];
  players: Player[];
  defaultSeasonId: string;
}) {
  const [state, action, pending] = useActionState(logMatch, initialActionState);

  if (players.length < 2) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">
        Two people need a login before a match can be logged — players are
        whoever can sign in.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5 p-4 sm:p-5">
      <FormError message={state.error} />

      <Field label="Season">
        <select name="season_id" defaultValue={defaultSeasonId} className={inputClass}>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
              {season.is_active ? " (current)" : ""}
            </option>
          ))}
        </select>
      </Field>

      {/*
        Keying on the last save is what clears the board: React throws the
        subtree away and mounts a fresh one, no reset effect needed.
      */}
      <Scoreboard key={state.savedAt ?? "new"} players={players} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Played on">
          <input
            key={state.savedAt ?? "new"}
            type="date"
            name="played_on"
            defaultValue={today()}
            className={inputClass}
          />
        </Field>
        <Field label="Note" hint="Optional — e.g. 'queen on the last board'.">
          <input
            key={state.savedAt ?? "new"}
            type="text"
            name="notes"
            maxLength={200}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save match"}
        </Button>
        {state.savedAt && !state.error && (
          <span className="text-sm text-positive">Saved.</span>
        )}
      </div>
    </form>
  );
}

/**
 * Who played and what they finished on. Everyone starts ticked, because two or
 * three of you is the whole roster -- untick whoever sat this one out.
 *
 * Each points box is named after its player (points_<uuid>) rather than being
 * one of two positional lists, so a name and a score cannot drift apart.
 */
function Scoreboard({ players }: { players: Player[] }) {
  const [playing, setPlaying] = useState<string[]>(() =>
    players.slice(0, 3).map((player) => player.id),
  );

  function toggle(playerId: string) {
    setPlaying((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">
        Who played, and their points
        <span className="ml-2 text-xs font-normal text-muted">
          {playing.length === 2 || playing.length === 3
            ? `${playing.length} playing`
            : "pick 2 or 3"}
        </span>
      </legend>

      {players.map((player) => {
        const isPlaying = playing.includes(player.id);

        return (
          <div
            key={player.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
              isPlaying ? "border-accent/40 bg-accent-soft/40" : "border-border"
            }`}
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="player_id"
                value={player.id}
                checked={isPlaying}
                onChange={() => toggle(player.id)}
                className="size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className={`truncate ${isPlaying ? "font-medium" : "text-muted"}`}>
                {player.name}
              </span>
            </label>

            <input
              type="number"
              name={`points_${player.id}`}
              // No inputMode="numeric": on iOS that is the digits-only keypad,
              // which has no minus key, and a minus is now a legal score.
              min={-999}
              max={999}
              step={1}
              required={isPlaying}
              disabled={!isPlaying}
              defaultValue=""
              placeholder="0"
              aria-label={`Points for ${player.name}`}
              className={`${inputBaseClass} numeric w-24 shrink-0 text-right disabled:opacity-40`}
            />
          </div>
        );
      })}
    </fieldset>
  );
}
