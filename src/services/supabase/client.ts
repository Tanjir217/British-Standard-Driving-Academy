import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public Supabase client for browser-side auth and RLS-protected data access.
 * This module deliberately does not contain or accept a service-role key.
 *
 * Lazy initialization keeps local builds possible before .env.local is set.
 * Auth/session storage is managed by supabase-js; database access remains
 * constrained by the user's JWT and the project's Row Level Security policies.
 */
let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local environment.",
    );
  }

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}
