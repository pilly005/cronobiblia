// CronoBiblia — content-sync edge function
//
// Returns the offline-download version manifest. Public (also works for
// guests): free packs for everyone, premium packs only listed for entitled
// users — enforced by RLS on content_packs.
//
// GET → { content_version, packs: [{ id, title, checksum, min_app_version, is_free }] }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handlePreflight, jsonWithCors } from "../_shared/cors.ts";

const CONTENT_VERSION = "2026-10-03.1"; // bump when the editorial catalog changes

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "GET") return jsonWithCors(req, { error: "GET only" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return jsonWithCors(req, { error: "Supabase is not configured" }, 500);
  }

  // Read through the caller's own context: forward the Authorization header
  // when present so premium packs resolve via RLS; anon otherwise.
  const authHeader = req.headers.get("authorization");
  const headers: Record<string, string> = { apikey: anonKey };
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(
    `${url}/rest/v1/content_packs?select=pack_id,title_es,content_version,checksum,min_app_version,is_free&status=eq.published&order=pack_id`,
    { headers },
  );
  if (!res.ok) {
    return jsonWithCors(req, { error: "No se pudo leer el manifiesto" }, 502);
  }
  const rows = (await res.json()) as Array<{
    pack_id: string;
    title_es: string;
    content_version: string;
    checksum: string;
    min_app_version: string;
    is_free: boolean;
  }>;

  return jsonWithCors(req, {
    content_version: CONTENT_VERSION,
    packs: rows.map((r) => ({
      id: r.pack_id,
      title: r.title_es,
      content_version: r.content_version,
      checksum: r.checksum,
      min_app_version: r.min_app_version,
      is_free: r.is_free,
    })),
  });
});
