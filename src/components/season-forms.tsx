"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button, Field, FormError, inputClass } from "@/components/ui";
import { activateSeason, closeSeason, createSeason } from "@/lib/actions/seasons";
import { initialActionState } from "@/lib/actions/shared";

export function NewSeasonForm() {
  const [state, action, pending] = useActionState(createSeason, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.savedAt) formRef.current?.reset();
  }, [state.savedAt]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4 p-4 sm:p-5">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Season name">
          <input
            type="text"
            name="name"
            required
            maxLength={60}
            placeholder="Season 2"
            className={inputClass}
          />
        </Field>
        <Field label="Starts on">
          <input type="date" name="started_on" className={inputClass} />
        </Field>
      </div>
      <p className="text-xs text-muted">
        Starting a season closes the current one. Its matches and standings stay
        exactly as they are.
      </p>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Starting…" : "Start season"}
        </Button>
      </div>
    </form>
  );
}

export function SeasonStateButton({
  seasonId,
  isActive,
}: {
  seasonId: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(
    isActive ? closeSeason : activateSeason,
    initialActionState,
  );

  return (
    <form action={action}>
      <input type="hidden" name="season_id" value={seasonId} />
      <button
        type="submit"
        disabled={pending}
        title={state.error}
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
      >
        {pending ? "…" : isActive ? "Close season" : "Make current"}
      </button>
    </form>
  );
}
