import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for public, read-only queries.
 * Unlike lib/supabase/server.ts, this doesn't call next/headers `cookies()`,
 * so pages that only need public data (no per-user branching) can stay
 * statically/ISR-rendered instead of being forced dynamic.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
