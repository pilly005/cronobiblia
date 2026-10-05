import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS build notes:
// - Static SPA: `npm run build:capacitor` emits dist/ via vite.capacitor.ts
//   (no SSR, no /api routes). The app calls Supabase Edge Functions for the
//   Ask-a-Historian feature via VITE_SUPABASE_URL (see src/lib/supabase.ts).
// - Native project: ios/ (generated with `npx cap add ios`). Open
//   ios/App/App.xcworkspace in Xcode on a Mac to build, sign, and archive
//   for TestFlight.
// - Deep link: cronobiblia://auth/callback (Supabase magic-link callback).
//   Register the scheme in the iOS target and in Supabase → Authentication →
//   URL Configuration → Redirect URLs.
// - RevenueCat (@revenuecat/purchases-capacitor) activates only in the native
//   app when VITE_REVENUECAT_IOS_KEY is set at build time.
const config: CapacitorConfig = {
  // Finalized: matches the App Store Connect record. Do not change after
  // the app record is created.
  appId: "com.cronobiblia.app",
  appName: "CronoBiblia",
  webDir: "dist",
};

export default config;
