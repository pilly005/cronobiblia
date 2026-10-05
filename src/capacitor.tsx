import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { App as CapApp } from "@capacitor/app";
import { getRouter } from "./router";
import { handleAuthCallbackUrl, isNativeApp } from "./lib/auth";
import { initializePurchases, refreshEntitlement } from "./lib/purchases";
import { applyAccessibilityPrefs } from "./lib/a11y";
import { recordVisit } from "./lib/local-progress";
import "./styles.css";

// Standalone SPA entry for the Capacitor native build.
// The Ask-a-Historian backend is Supabase Edge Functions — the app calls them
// via VITE_SUPABASE_URL (see src/lib/supabase.ts).

applyAccessibilityPrefs();
recordVisit();

// Purchases (spec §8 / §11): configure RevenueCat at launch and refresh the
// `premium` entitlement. refreshEntitlement never throws — on network loss it
// returns the last validated cached state, so premium is never silently
// locked out (the UI offers retry + restore instead).
function bootPurchases() {
  initializePurchases()
    .then(() => refreshEntitlement())
    .catch(() => {
      /* cached state is used; UI offers retry + restore */
    });
}
bootPurchases();

// Deep links (cronobiblia://…): Supabase magic-link callbacks land here.
// handleAuthCallbackUrl exchanges the code for a session; the
// onAuthStateChange subscription in useSupabaseSession then flips the UI.
if (isNativeApp) {
  const handleUrl = async (url: string | null | undefined) => {
    if (!url) return;
    const { handled, error } = await handleAuthCallbackUrl(url);
    if (error) {
      // Surface the failure in the sign-in UI instead of failing silently.
      window.dispatchEvent(
        new CustomEvent<string>("cronobiblia:auth-error", { detail: error }),
      );
    }
    if (handled) {
      // Close the system browser if an OAuth flow opened it.
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch {
        /* browser wasn't open */
      }
    }
  };
  // Cold start: the app was launched from the deep link (e.g. tapping a magic
  // link in Mail). appUrlOpen does NOT fire in this case — the URL is only
  // available via getLaunchUrl().
  CapApp.getLaunchUrl()
    .then((launch) => handleUrl(launch?.url))
    .catch(() => {
      /* no launch URL */
    });
  // Warm: deep link received while the app is already running.
  CapApp.addListener("appUrlOpen", ({ url }) => {
    void handleUrl(url);
  });
  // Return to foreground: re-check the premium entitlement so cancellations
  // or renewals processed outside the app take effect immediately.
  CapApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) void refreshEntitlement();
  });
}

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
