import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase, isSupabaseConfigured } from "./supabase";
import { refreshEntitlement, linkPurchasesUser } from "./purchases";
import { NATIVE_AUTH_CALLBACK, URL_SCHEME } from "./brand";

/** Deep-link callback for the native app. Must be allow-listed in
 *  Supabase → Authentication → URL Configuration → Redirect URLs. */
export { NATIVE_AUTH_CALLBACK };

export const isNativeApp =
  typeof window !== "undefined" && Capacitor.isNativePlatform();

/** Where Supabase should send the user after a magic link / OAuth login:
 *  back into the native app via deep link, or the web origin on browsers. */
export function authRedirectUrl(): string {
  if (isNativeApp) return NATIVE_AUTH_CALLBACK;
  return window.location.origin;
}

/**
 * Handles an incoming `cronobiblia://auth/callback` deep link (fired from the
 * Capacitor `appUrlOpen` listener or read via `getLaunchUrl()` on cold start).
 * Supabase redirects here after verifying a magic link or OAuth login.
 * Supports both PKCE (`?code=…`) and implicit (`#access_token=…&refresh_token=…`)
 * callbacks. Returns whether the URL was an auth callback and, when handled,
 * an error message for the UI when the session could not be established
 * (null on success).
 */
export async function handleAuthCallbackUrl(
  url: string,
): Promise<{ handled: boolean; error: string | null }> {
  if (!supabase) return { handled: false, error: null };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { handled: false, error: null };
  }
  // NOTE: for a custom scheme, `new URL("cronobiblia://auth/callback")`
  // parses as host="auth", pathname="/callback" (WHATWG URL treats "auth" as
  // the authority, not part of the path). Check host + path accordingly.
  if (
    parsed.protocol !== `${URL_SCHEME}:` ||
    parsed.host !== "auth" ||
    !parsed.pathname.startsWith("/callback")
  ) {
    return { handled: false, error: null };
  }
  try {
    // PKCE flow (flowType: "pkce" in src/lib/supabase.ts): exchange the code
    // for a session. The code_verifier lives in the same WebView's
    // localStorage, so this works even though the link arrived via deep link.
    const code = parsed.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return { handled: true, error: null };
    }
    // Implicit flow fallback: tokens arrive in the URL fragment.
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) throw error;
      return { handled: true, error: null };
    }
    const err =
      parsed.searchParams.get("error_description") ||
      hash.get("error_description");
    return {
      handled: true,
      error:
        err ||
        "El enlace de acceso no es válido o caducó. Solicita uno nuevo.",
    };
  } catch (e) {
    console.warn("Auth callback handling failed:", e);
    const msg = e instanceof Error && e.message ? e.message : null;
    return {
      handled: true,
      error: msg || "No se pudo iniciar sesión. Inténtalo de nuevo.",
    };
  }
}

/** Tracks the Supabase session. No-ops (user=null, ready=true) until configured. */
export function useSupabaseSession() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      // Link RevenueCat to the restored session: no SIGNED_IN event fires
      // when the session is restored from storage at launch.
      void linkPurchasesUser(data.session?.user?.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === "SIGNED_IN") {
          // Link RevenueCat to the Supabase account so the webhook's
          // server-side entitlement cache follows this user, then re-check
          // the premium entitlement so a subscription bought under this
          // Apple account activates right after sign-in.
          void linkPurchasesUser(session?.user?.id ?? null);
          void refreshEntitlement();
        } else if (event === "SIGNED_OUT") {
          void linkPurchasesUser(null);
        }
      },
    );
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, ready };
}

/** Passwordless email sign-in: Supabase emails a magic link. On the native
 *  app the link deep-links back into CronoBiblia (cronobiblia://auth/callback). */
export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw error;
}

export async function signOut() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* already signed out */
    }
  }
}

/** Calls the `delete-account` Edge Function, then signs out locally. */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado");
  const { error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  });
  if (error) throw error;
  await signOut();
}
