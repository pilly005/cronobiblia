import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase client (Phase 2 — real backend)
// ---------------------------------------------------------------------------
// 1. John creates a free project at https://supabase.com/dashboard
// 2. Project Settings → API → copy the Project URL and the *anon* public key
// 3. Add them to a `.env` file at the repo root (never commit it):
//
//      VITE_SUPABASE_URL=https://xyzcompany.supabase.co
//      VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
//
// (The legacy VITE_SUPABASE_ANON_KEY name is also accepted.)
// ---------------------------------------------------------------------------

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          // Persist the session on-device; Supabase handles refresh tokens.
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // PKCE: magic-link / OAuth callbacks arrive as ?code= (query param),
          // which survives the Safari -> custom-scheme deep-link handoff.
          // The implicit flow's #access_token fragment can be dropped there.
          flowType: "pkce",
        },
      })
    : null;
