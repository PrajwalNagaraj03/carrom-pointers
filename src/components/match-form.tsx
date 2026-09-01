"use client";

import { useActionState, useState } from "react";

import { Button, Field, FormError, inputClass } from "@/components/ui";
import { logMatch } from "@/lib/actions/matches";
import { initialActionState } from "@/lib/actions/shared";
import type { MatchFormat, Player, Season } from "@/lib/types/database";

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
  // Format lives out here so it survives a save -- you usually log several
  // boards of the same kind in a row.
  const [format, setFormat] = useState<MatchFormat>("singles");

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

      <div className="grid gap-4 sm:grid-cols-2">
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

        <Field label="Format">
          <div className="flex gap-2">
            {(["singles", "doubles"] as const).map((option) => (
              <label
                key={option}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm capitalize transition-colors ${
                  format === option
                    ? "border-accent bg-accent-soft font-medium text-accent"
                    : "border-border text-muted hover:bg-surface-muted"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={option}
                  checked={format === option}
                  onChange={() => setFormat(option)}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </Field>
      </div>

      {/*
        Keying on the last save is what clears the roster and scores: React
        throws the subtree away and mounts a fresh one, no reset effect needed.
      */}
      <MatchRoster
        key={`${format}-${state.savedAt ?? "new"}`}
        format={format}
        players={players}
      />

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
 * Who played and what they scored. Held apart from the rest of the form so the
 * whole thing can be reset by remounting it.
 */
function MatchRoster({
  format,
  players,
}: {
  format: MatchFormat;
  players: Player[];
}) {
  const perSide = format === "singles" ? 1 : 2;
  const [sideA, setSideA] = useState<string[]>(Array(perSide).fill(""));
  const [sideB, setSideB] = useState<string[]>(Array(perSide).fill(""));

  const taken = new Set([...sideA, ...sideB].filter(Boolean));

  function playerSelect(side: "A" | "B", index: number) {
    const values = side === "A" ? sideA : sideB;
    const setValues = side === "A" ? setSideA : setSideB;

    return (
      <select
        key={index}
        name={side === "A" ? "side_a" : "side_b"}
        value={values[index] ?? ""}
        onChange={(event) => {
          const next = [...values];
          next[index] = event.target.value;
          setValues(next);
        }}
        className={inputClass}
        aria-label={`Side ${side}, player ${index + 1}`}
        required
      >
        <option value="">Choose a player…</option>
        {players.map((player) => (
          <option
            key={player.id}
            value={player.id}
            // Already picked elsewhere in this match; the database refuses it too.
            disabled={taken.has(player.id) && values[index] !== player.id}
          >
            {player.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
      <SidePanel label="Side A" scoreName="side_a_score">
        {Array.from({ length: perSide }, (_, index) => playerSelect("A", index))}
      </SidePanel>

      <div className="hidden self-center pt-10 text-sm font-medium text-muted sm:block">
        vs
      </div>

      <SidePanel label="Side B" scoreName="side_b_score">
        {Array.from({ length: perSide }, (_, index) => playerSelect("B", index))}
      </SidePanel>
    </div>
  );
}

function SidePanel({
  label,
  scoreName,
  children,
}: {
  label: string;
  scoreName: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-border bg-surface-muted/50 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </legend>
      <div className="flex flex-col gap-2">
        {children}
        <Field label="Score">
          <input
            type="number"
            name={scoreName}
            inputMode="numeric"
            min={0}
            max={100}
            required
            defaultValue=""
            className={`${inputClass} numeric`}
          />
        </Field>
      </div>
    </fieldset>
  );
}
