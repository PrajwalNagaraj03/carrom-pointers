"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/shared";

const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/**
 * Sign-in runs server-side so the session cookies come back HttpOnly and the
 * password never touches client-side JavaScript.
 *
 * Accounts are created by hand in the Supabase dashboard -- there is no sign-up
 * path here, and the trigger on auth.users would refuse an unlisted email anyway.
 */
export async function signIn(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately vague: a precise message would say which of the three
    // addresses exist.
    return { error: "That email and password do not match an account." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
