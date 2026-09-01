import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * The real gate, called by every page and every server action.
 *
 * The app_members lookup is not decoration: RLS only lets that select return a
 * row when the caller's JWT email is on the access list, so an empty result is
 * the database itself saying "not you".
 *
 * Two things keep this off the critical path of every navigation:
 *
 *  - getClaims() verifies the session's JWT against the project's public signing
 *    key, in process, using WebCrypto. getUser() asks the Auth server the same
 *    question over the network every single time. (A project still signing with
 *    the legacy shared secret has no public key to check against, so getClaims()
 *    falls back to that same request -- no worse than before.)
 *  - cache() memoises the whole thing per render, so the layout, the page and
 *    anything else that calls it share one check rather than one each.
 */
export const requireMember = cache(async () => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("app_members")
    .select("email, display_name, is_admin")
    .eq("email", (claims.email ?? "").toLowerCase())
    .maybeSingle();

  if (!member) {
    redirect("/auth/no-access");
  }

  return {
    supabase,
    user: { id: claims.sub, email: claims.email ?? null },
    member,
  };
});

export type Member = Awaited<ReturnType<typeof requireMember>>["member"];
