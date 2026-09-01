"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button, FormError, inputClass } from "@/components/ui";
import { addPlayer, setPlayerActive } from "@/lib/actions/players";
import { initialActionState } from "@/lib/actions/shared";

export function AddPlayerForm() {
  const [state, action, pending] = useActionState(addPlayer, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.savedAt) formRef.current?.reset();
  }, [state.savedAt]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 p-4 sm:p-5">
      <FormError message={state.error} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="name"
          required
          maxLength={40}
          placeholder="Player name"
          aria-label="Player name"
          className={inputClass}
        />
        <Button type="submit" disabled={pending} className="sm:w-auto">
          {pending ? "Adding…" : "Add player"}
        </Button>
      </div>
    </form>
  );
}

export function TogglePlayerButton({
  playerId,
  isActive,
}: {
  playerId: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(setPlayerActive, initialActionState);

  return (
    <form action={action}>
      <input type="hidden" name="player_id" value={playerId} />
      <input type="hidden" name="is_active" value={isActive ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        title={state.error ?? (isActive ? "Hide from new matches" : "Bring back")}
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
      >
        {pending ? "…" : isActive ? "Deactivate" : "Reactivate"}
      </button>
    </form>
  );
}
