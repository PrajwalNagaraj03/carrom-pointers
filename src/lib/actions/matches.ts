"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/auth";
import { describe, saved, type ActionState } from "@/lib/actions/shared";

const matchSchema = z
  .object({
    season_id: z.uuid("Pick a season."),
    scores: z
      .array(
        z.object({
          player_id: z.uuid(),
          points: z.coerce
            .number()
            .int("Points are whole numbers.")
            // Negative is allowed -- a bad board can cost you.
            .min(-999, "That score looks wrong.")
            .max(999, "That score looks wrong."),
        }),
      )
      .min(2, "A match is 2 or 3 players — tick who played.")
      .max(3, "A match is 2 or 3 players."),
    played_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    name: z.string().trim().max(60, "Keep the match name short.").optional(),
    notes: z.string().trim().max(200, "Keep the note short.").optional(),
  })
  .superRefine((value, ctx) => {
    const ids = value.scores.map((entry) => entry.player_id);

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "The same player cannot appear twice in one match.",
      });
    }
  });

/**
 * The form ticks who played and gives each of them a points box named after
 * their id, so the two never come apart the way two positional lists can.
 */
function scoresFrom(formData: FormData) {
  return formData
    .getAll("player_id")
    .map((value) => String(value))
    .filter(Boolean)
    .map((playerId) => ({
      player_id: playerId,
      points: formData.get(`points_${playerId}`) ?? "",
    }));
}

export async function logMatch(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const parsed = matchSchema.safeParse({
    season_id: formData.get("season_id"),
    scores: scoresFrom(formData),
    played_on: formData.get("played_on") ?? "",
    name: formData.get("name") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { season_id, scores, played_on, name, notes } = parsed.data;

  const { error } = await supabase.rpc("create_match", {
    p_season_id: season_id,
    p_players: scores.map((entry) => entry.player_id),
    p_points: scores.map((entry) => entry.points),
    // A date-only input means "some time that day"; midday keeps it on the right
    // day whichever timezone reads it back.
    ...(played_on ? { p_played_at: new Date(`${played_on}T12:00:00`).toISOString() } : {}),
    ...(name ? { p_name: name } : {}),
    ...(notes ? { p_notes: notes } : {}),
  });

  if (error) {
    return { error: describe(error, "Could not save that match.") };
  }

  revalidatePath("/", "layout");
  return saved();
}

const correctionSchema = z.object({
  match_id: z.uuid("Unknown match."),
  scores: z
    .array(
      z.object({
        player_id: z.uuid(),
        points: z.coerce
          .number()
          .int("Points are whole numbers.")
          .min(-999, "That score looks wrong.")
          .max(999, "That score looks wrong."),
      }),
    )
    .min(2, "A match is 2 or 3 players."),
  played_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  name: z.string().trim().max(60, "Keep the match name short.").optional(),
  notes: z.string().trim().max(200, "Keep the note short.").optional(),
});

/**
 * Correcting a match already logged. Everyone may do this -- it is the typo fix.
 *
 * Who played is not editable: dropping a player means deleting a row, and that
 * is reserved for an admin. update_match refuses a changed roster outright.
 */
export async function updateMatch(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const parsed = correctionSchema.safeParse({
    match_id: formData.get("match_id"),
    scores: scoresFrom(formData),
    played_on: formData.get("played_on") ?? "",
    name: formData.get("name") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { match_id, scores, played_on, name, notes } = parsed.data;

  const { error } = await supabase.rpc("update_match", {
    p_match_id: match_id,
    p_players: scores.map((entry) => entry.player_id),
    p_points: scores.map((entry) => entry.points),
    // Cleared boxes clear the stored value, which is what an edit form should do.
    p_name: name ?? null,
    p_notes: notes ?? null,
    ...(played_on ? { p_played_at: new Date(`${played_on}T12:00:00`).toISOString() } : {}),
  });

  if (error) {
    return { error: describe(error, "Could not save that correction.") };
  }

  revalidatePath("/", "layout");
  return saved();
}

export async function deleteMatch(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, member } = await requireMember();

  const matchId = z.uuid().safeParse(formData.get("match_id"));
  if (!matchId.success) {
    return { error: "Unknown match." };
  }

  if (!member.is_admin) {
    return { error: "Only an admin can delete a match." };
  }

  // match_players rows go with it (on delete cascade). Asking for the deleted
  // ids back is what makes the RLS policy audible: a delete the policy refuses
  // is not an error, it simply matches no rows and reports success.
  const { data, error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId.data)
    .select("id");

  if (error) {
    return { error: describe(error, "Could not delete that match.") };
  }

  if ((data?.length ?? 0) === 0) {
    return { error: "That match was not deleted -- it is not yours to remove." };
  }

  revalidatePath("/", "layout");
  return saved();
}
