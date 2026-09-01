import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Per-request server client. Never cache or share this across requests -- it
 * carries the caller's session, and that is what RLS keys off.
 *
 * cache() is exactly that scope: React memoises it for the life of one render,
 * so the layout and the page inside it share a client (and its session lookup)
 * instead of building one each and paying for the same round trips twice.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. Harmless: src/proxy.ts refreshes
          // the session on every request, so the write here is redundant.
        }
      },
    },
  });
});
