import type { PostgrestError } from "@supabase/supabase-js";

/**
 * What every form action returns. `savedAt` is a timestamp rather than a
 * boolean so that two successful saves in a row are distinguishable -- that is
 * what lets a form clear itself after each one.
 */
export type ActionState = { error?: string; savedAt?: number };

export const initialActionState: ActionState = {};

export function saved(): ActionState {
  return { savedAt: Date.now() };
}

/**
 * Turns a Postgres complaint into something readable. The database is where the
 * real rules live (unique names, roster sizes, score ranges), so its errors are
 * worth surfacing rather than swallowing.
 */
export function describe(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;

  if (error.code === "23505") {
    return "That name is already taken.";
  }
  if (error.code === "42501" || error.code === "PGRST301") {
    return "Your account is not allowed to make that change.";
  }

  // Exceptions raised by our own functions arrive with their message intact.
  return error.message || fallback;
}
