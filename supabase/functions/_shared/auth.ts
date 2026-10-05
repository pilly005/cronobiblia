// Shared auth helpers for CronoBiblia edge functions.
//
// Usage:
//   const client = supabaseUserClient();          // anon key client
//   const user = await requireUser(client, req);  // throws HttpError(401/403)
//   const premium = await isPremiumFor(client, user.id);

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function supabaseUserClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new HttpError(500, "Supabase is not configured");
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client: server-side only, bypasses RLS. Never send to clients. */
export function supabaseAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new HttpError(500, "Supabase is not configured");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Extracts the bearer JWT from the request. */
export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/** Returns the authenticated user or throws HttpError(401). */
export async function requireUser(client: SupabaseClient, req: Request) {
  const jwt = bearerToken(req);
  if (!jwt) throw new HttpError(401, "Missing authorization");
  const { data: { user }, error } = await client.auth.getUser(jwt);
  if (error || !user) throw new HttpError(401, "Invalid session");
  return user;
}

/** True when the user holds an active premium entitlement (own row, RLS-safe). */
export async function isPremiumFor(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("entitlements")
    .select("status, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  if (data.status !== "active") return false;
  if (data.expires_at && new Date(data.expires_at) <= new Date()) return false;
  return true;
}
