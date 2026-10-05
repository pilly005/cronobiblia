import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { initializePurchases, refreshEntitlement } from "./lib/purchases";
import { applyAccessibilityPrefs } from "./lib/a11y";
import { recordVisit } from "./lib/local-progress";
import "./styles.css";

// Web entry (npm run build / dev). The native iOS build uses src/capacitor.tsx.
applyAccessibilityPrefs();
recordVisit();

// Purchases: configure RevenueCat at launch and refresh the `premium`
// entitlement (no-ops gracefully on web / without a key — see
// src/lib/purchases.ts).
function bootPurchases() {
  initializePurchases()
    .then(() => refreshEntitlement())
    .catch(() => {
      /* cached state is used; UI offers retry + restore */
    });
}
bootPurchases();

// Return to the tab: re-check the premium entitlement.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshEntitlement();
  });
}

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
