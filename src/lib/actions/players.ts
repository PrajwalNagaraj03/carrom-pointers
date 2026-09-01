"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/auth";
import { describe, saved, type ActionState } from "@/lib/actions/shared";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Give the player a name.")
  .max(40, "That name is too long.");

export async function addPlayer(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("players").insert({ name: parsed.data });

  if (error) {
    return { error: describe(error, "Could not add that player.") };
  }

  revalidatePath("/", "layout");
  return saved();
}

export async function setPlayerActive(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireMember();

  const parsed = z
    .object({ player_id: z.uuid(), is_active: z.enum(["true", "false"]) })
    .safeParse({
      player_id: formData.get("player_id"),
      is_active: formData.get("is_active"),
    });

  if (!parsed.success) {
    return { error: "Unknown player." };
  }

  const { error } = await supabase
    .from("players")
    .update({ is_active: parsed.data.is_active === "true" })
    .eq("id", parsed.data.player_id);

  if (error) {
    return { error: describe(error, "Could not update that player.") };
  }

  revalidatePath("/", "layout");
  return saved();
}
