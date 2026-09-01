"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/auth";
import { saved, type ActionState } from "@/lib/actions/shared";

const passwordChange = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Passwords are limited to 72 characters."),
    confirm_password: z.string(),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    message: "The two new passwords do not match.",
  })
  .refine((value) => value.new_password !== value.current_password, {
    message: "That is your current password.",
  });

/**
 * Changing your own password.
 *
 * The current password is re-checked first. Without it, anyone who got hold of
 * a signed-in browser could lock the owner out by setting a new password
 * without knowing the old one.
 */
export async function changePassword(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireMember();

  const parsed = passwordChange.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: parsed.data.current_password,
  });

  if (reauthError) {
    return { error: "That is not your current password." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) {
    return { error: error.message || "Could not change your password." };
  }

  revalidatePath("/account");
  return saved();
}
