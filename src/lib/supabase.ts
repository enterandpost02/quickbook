import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the configured Supabase client if NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are provided in the environment.
 * Note: Database queries and transactions go through Drizzle ORM (`src/db/index.ts`)
 * connected to Supabase Postgres (`DATABASE_URL`).
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey);
  }

  return supabaseInstance;
}
