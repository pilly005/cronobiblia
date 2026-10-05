// CronoBiblia — delete-account edge function
//
// Authenticated user only. Deletes/anonymizes ALL user-linked rows per the
// privacy policy, then deletes the Supabase auth user via the service role.
//
// POST with Authorization: Bearer <user access token>
// → { deleted: true, removed: { profiles, progress, ... } }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handlePreflight, jsonWithCors } from "../_shared/cors.ts";
import {
  HttpError,
  supabaseUserClient,
  supabaseAdminClient,
  requireUser,
} from "../_shared/auth.ts";

// Every user-linked table and how the privacy policy treats it.
const USER_TABLES = [
  "progress",
  "bookmarks",
  "quiz_attempts",
  "downloads",
  "ai_usage",
  "feedback", // feedback rows are deleted (device_id would otherwise re-identify)
  "entitlements",
  "profiles",
] as const;

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonWithCors(req, { error: "POST only" }, 405);

  try {
    const client = supabaseUserClient();
    const user = await requireUser(client, req);
    const admin = supabaseAdminClient();

    const removed: Record<string, number> = {};
    for (const table of USER_TABLES) {
      const { error, count } = await admin
        .from(table)
        .delete({ count: "exact" })
        .eq("user_id", user.id);
      if (error) throw new HttpError(500, `No se pudo borrar ${table}`);
      removed[table] = count ?? 0;
    }

    // Finally delete the auth user itself.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw new HttpError(500, "No se pudo eliminar la cuenta");

    console.log(JSON.stringify({ event: "account_deleted", user_id: user.id }));
    return jsonWithCors(req, { deleted: true, removed });
  } catch (e) {
    if (e instanceof HttpError) return jsonWithCors(req, { error: e.message }, e.status);
    console.error("delete-account error:", String(e).slice(0, 300));
    return jsonWithCors(req, { error: "No se pudo eliminar la cuenta" }, 500);
  }
});
