// CronoBiblia — revenuecat-webhook edge function
//
// Receives RevenueCat webhook events, verifies the HMAC-SHA256 signature of
// the raw body against the REVENUECAT_WEBHOOK_SECRET env secret, and upserts
// the server-side entitlement cache for the two locked product IDs:
//
//   cronobiblia_premium_monthly → $6.99/mo  → entitlement "premium"
//   cronobiblia_premium_annual  → $49.99/yr → entitlement "premium"
//
// RevenueCat sends the app user id in event.app_user_id — the app must set
// this to the Supabase user id at login (Purchases.logIn).
//
// Setup in RevenueCat dashboard → Integrations → Webhooks:
//   set the "Authorization" secret to the same REVENUECAT_WEBHOOK_SECRET value.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MONTHLY_PRODUCT = "cronobiblia_premium_monthly";
const ANNUAL_PRODUCT = "cronobiblia_premium_annual";
const PREMIUM_PRODUCTS = new Set([MONTHLY_PRODUCT, ANNUAL_PRODUCT]);

type RcEvent = {
  type: string;
  id?: string;
  app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const clean = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  return timingSafeEqual(hex, clean.toLowerCase());
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Webhook is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-revenuecat-signature") ??
    req.headers.get("authorization");
  if (!(await verifySignature(rawBody, signature, secret))) {
    console.warn("revenuecat-webhook: signature mismatch");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: { event?: RcEvent };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const event = payload.event;
  if (!event || !event.app_user_id) {
    return new Response(JSON.stringify({ ok: true, skipped: "no app_user_id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const productId = event.product_id ?? "";
  if (!PREMIUM_PRODUCTS.has(productId)) {
    // Not one of our two products: ignore (never touch entitlements).
    console.log(JSON.stringify({
      event: "rc_webhook_ignored",
      type: event.type,
      product_id: productId,
    }));
    return new Response(JSON.stringify({ ok: true, skipped: "unknown product" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // CANCELLATION keeps access until the period ends; EXPIRATION ends it.
  const expired = event.type === "EXPIRATION";
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  const { error } = await admin.from("entitlements").upsert({
    user_id: event.app_user_id,
    status: expired ? "expired" : "active",
    product_id: productId,
    expires_at: expiresAt,
  }, { onConflict: "user_id" });

  if (error) {
    console.error("revenuecat-webhook upsert error:", error.message.slice(0, 200));
    return new Response(JSON.stringify({ error: "Upsert failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(JSON.stringify({
    event: "rc_webhook_applied",
    type: event.type,
    product_id: productId,
    status: expired ? "expired" : "active",
  }));
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
