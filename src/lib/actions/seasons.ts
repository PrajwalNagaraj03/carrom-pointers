"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/auth";
import { describe, saved, type ActionState } from "@/lib/actions/shared";

const seasonSchema = z.object({
  name: z.string().trim().min(1, "Give the season a name.").max(60, "That name is too long."),
  started_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid start date.")
    .optional()
    .or(z.literal("")),
});

function refresh() {
  revalidatePath("/", "layout");
}

export async function createSeason(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    started_on: formData.get("started_on") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.rpc("create_season", {
    p_name: parsed.data.name,
    ...(parsed.data.started_on ? { p_started_on: parsed.data.started_on } : {}),
  });

  if (error) {
    return { error: describe(error, "Could not create the season.") };
  }

  refresh();
  return saved();
}

export async function activateSeason(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const seasonId = z.uuid().safeParse(formData.get("season_id"));
  if (!seasonId.success) {
    return { error: "Unknown season." };
  }

  const { error } = await supabase.rpc("activate_season", {
    p_season_id: seasonId.data,
  });

  if (error) {
    return { error: describe(error, "Could not make that season current.") };
  }

  refresh();
  return saved();
}

export async function closeSeason(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const seasonId = z.uuid().safeParse(formData.get("season_id"));
  if (!seasonId.success) {
    return { error: "Unknown season." };
  }

  const { error } = await supabase.rpc("close_season", {
    p_season_id: seasonId.data,
  });

  if (error) {
    return { error: describe(error, "Could not close the season.") };
  }

  refresh();
  return saved();
}
