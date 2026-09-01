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
    // A rejected password is answered vaguely on purpose -- a precise message
    // would say which of the three addresses exist. Anything else is a fault on
    // our side, and saying "wrong password" for those wastes hours: report it.
    const badCredentials =
      error.code === "invalid_credentials" ||
      error.code === "email_not_confirmed" ||
      error.status === 400;

    if (badCredentials) {
      return { error: "That email and password do not match an account." };
    }

    console.error("[signIn] unexpected auth failure", {
      status: error.status,
      code: error.code,
      message: error.message,
    });

    return {
      error: `Sign-in failed (${error.status ?? "no status"}): ${error.message}`,
    };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
