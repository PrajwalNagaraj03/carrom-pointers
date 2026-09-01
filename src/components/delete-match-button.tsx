"use client";

import { useActionState } from "react";

import { deleteMatch } from "@/lib/actions/matches";
import { initialActionState } from "@/lib/actions/shared";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const [state, action, pending] = useActionState(deleteMatch, initialActionState);

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="match_id" value={matchId} />
      <button
        type="submit"
        disabled={pending}
        title={state.error ?? "Delete this match"}
        aria-label="Delete this match"
        className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-accent-soft hover:text-negative disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
    </form>
  );
}
