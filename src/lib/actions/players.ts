"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/auth";
import { describe, saved, type ActionState } from "@/lib/actions/shared";

/**
 * Deactivating and reactivating is the only write the app has on players: a
 * player row is created by the database when someone joins the allowlist (see
 * migration 0005), never from here.
 */
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
