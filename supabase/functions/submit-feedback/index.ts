// CronoBiblia — submit-feedback edge function
//
// Private user reports (corrections, bugs, suggestions). Authenticated users
// post with their JWT; guests post with a device_id. Rate-limited server-side.
//
// POST { kind?, content_item_id?, message, device_id? }
// → { received: true }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handlePreflight, jsonWithCors } from "../_shared/cors.ts";
import {
  HttpError,
  supabaseUserClient,
  supabaseAdminClient,
  bearerToken,
} from "../_shared/auth.ts";

const MAX_BODY_BYTES = 8_000;
const MAX_MESSAGE_CHARS = 2_000;
const RATE_LIMIT_PER_HOUR = 10;
const VALID_KINDS = new Set(["correction", "bug", "suggestion", "other"]);

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonWithCors(req, { error: "POST only" }, 405);

  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonWithCors(req, { error: "Cuerpo demasiado grande" }, 413);
    }
    let body: {
      kind?: unknown;
      content_item_id?: unknown;
      message?: unknown;
      device_id?: unknown;
    };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonWithCors(req, { error: "JSON inválido" }, 400);
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 1 || message.length > MAX_MESSAGE_CHARS) {
      return jsonWithCors(req, { error: "Mensaje inválido" }, 400);
    }
    const kind = typeof body.kind === "string" && VALID_KINDS.has(body.kind)
      ? body.kind
      : "other";
    const contentItemId = typeof body.content_item_id === "string" && body.content_item_id.length > 0
      ? body.content_item_id
      : null;

    const client = supabaseUserClient();

    // Optional auth: resolve user when a bearer token is present.
    let userId: string | null = null;
    const jwt = bearerToken(req);
    if (jwt) {
      const { data: { user } } = await client.auth.getUser(jwt);
      if (user) userId = user.id;
    }
    const deviceId = userId
      ? null
      : (typeof body.device_id === "string" && body.device_id.length >= 8
        ? body.device_id.slice(0, 128)
        : null);
    if (!userId && !deviceId) {
      return jsonWithCors(req, { error: "Se requiere sesión o device_id" }, 401);
    }

    // Server-side rate limit (per user or per device, rolling hour).
    const admin = supabaseAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let recentQuery = admin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .gt("created_at", since);
    recentQuery = userId
      ? recentQuery.eq("user_id", userId)
      : recentQuery.eq("device_id", deviceId!);
    const { count } = await recentQuery;
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return jsonWithCors(req, {
        error: "Demasiados mensajes. Inténtalo más tarde.",
      }, 429);
    }

    const { error } = await admin.from("feedback").insert({
      user_id: userId,
      device_id: deviceId,
      kind,
      content_item_id: contentItemId,
      message,
    });
    if (error) throw new HttpError(500, "No se pudo guardar el mensaje");

    return jsonWithCors(req, { received: true });
  } catch (e) {
    if (e instanceof HttpError) return jsonWithCors(req, { error: e.message }, e.status);
    console.error("submit-feedback error:", String(e).slice(0, 300));
    return jsonWithCors(req, { error: "No se pudo guardar el mensaje" }, 500);
  }
});
