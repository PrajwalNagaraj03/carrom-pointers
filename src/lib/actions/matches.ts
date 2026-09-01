"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/auth";
import { describe, saved, type ActionState } from "@/lib/actions/shared";

const score = z.coerce
  .number()
  .int("Scores are whole numbers.")
  .min(0, "A score cannot be negative.")
  .max(100, "That score looks wrong.");

const matchSchema = z
  .object({
    season_id: z.uuid("Pick a season."),
    format: z.enum(["singles", "doubles"]),
    side_a: z.array(z.uuid()).min(1),
    side_b: z.array(z.uuid()).min(1),
    side_a_score: score,
    side_b_score: score,
    played_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    notes: z.string().trim().max(200, "Keep the note short.").optional(),
  })
  .superRefine((value, ctx) => {
    const perSide = value.format === "singles" ? 1 : 2;

    if (value.side_a.length !== perSide || value.side_b.length !== perSide) {
      ctx.addIssue({
        code: "custom",
        message:
          value.format === "singles"
            ? "Pick one player for each side."
            : "Pick two players for each side.",
      });
      return;
    }

    const roster = [...value.side_a, ...value.side_b];
    if (new Set(roster).size !== roster.length) {
      ctx.addIssue({
        code: "custom",
        message: "The same player cannot appear twice in one match.",
      });
    }
  });

/** Empty selects submit "", which is not a player id. */
function playerIds(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .map((value) => String(value))
    .filter(Boolean);
}

export async function logMatch(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const parsed = matchSchema.safeParse({
    season_id: formData.get("season_id"),
    format: formData.get("format"),
    side_a: playerIds(formData, "side_a"),
    side_b: playerIds(formData, "side_b"),
    side_a_score: formData.get("side_a_score"),
    side_b_score: formData.get("side_b_score"),
    played_on: formData.get("played_on") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { season_id, format, side_a, side_b, side_a_score, side_b_score, played_on, notes } =
    parsed.data;

  const { error } = await supabase.rpc("create_match", {
    p_season_id: season_id,
    p_format: format,
    p_side_a: side_a,
    p_side_b: side_b,
    p_side_a_score: side_a_score,
    p_side_b_score: side_b_score,
    // A date-only input means "some time that day"; midday keeps it on the right
    // day whichever timezone reads it back.
    ...(played_on ? { p_played_at: new Date(`${played_on}T12:00:00`).toISOString() } : {}),
    ...(notes ? { p_notes: notes } : {}),
  });

  if (error) {
    return { error: describe(error, "Could not save that match.") };
  }

  revalidatePath("/", "layout");
  return saved();
}

export async function deleteMatch(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const matchId = z.uuid().safeParse(formData.get("match_id"));
  if (!matchId.success) {
    return { error: "Unknown match." };
  }

  // match_players rows go with it (on delete cascade).
  const { error } = await supabase.from("matches").delete().eq("id", matchId.data);

  if (error) {
    return { error: describe(error, "Could not delete that match.") };
  }

  revalidatePath("/", "layout");
  return saved();
}
