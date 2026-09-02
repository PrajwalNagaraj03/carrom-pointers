"use client";

import { useActionState } from "react";

import { rowActionClass } from "@/components/ui";
import { setPlayerActive } from "@/lib/actions/players";
import { initialActionState } from "@/lib/actions/shared";

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
        className={rowActionClass}
      >
        {pending ? "…" : isActive ? "Deactivate" : "Reactivate"}
      </button>
    </form>
  );
}
