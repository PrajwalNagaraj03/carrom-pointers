"use client";

import { useActionState } from "react";

import { rowActionClass } from "@/components/ui";
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
        className={`${rowActionClass} border-transparent hover:border-border hover:bg-accent-soft hover:text-negative`}
      >
        {pending ? "…" : "Delete"}
      </button>
    </form>
  );
}
