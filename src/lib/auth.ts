import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * The real gate, called by every page and every server action.
 *
 * The app_members lookup is not decoration: RLS only lets that select return a
 * row when the caller's JWT email is on the access list, so an empty result is
 * the database itself saying "not you".
 */
export async function requireMember() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("app_members")
    .select("email, display_name")
    .eq("email", (user.email ?? "").toLowerCase())
    .maybeSingle();

  if (!member) {
    redirect("/auth/no-access");
  }

  return { supabase, user, member };
}

export type Member = Awaited<ReturnType<typeof requireMember>>["member"];
