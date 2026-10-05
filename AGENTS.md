# AGENTS.md — CronoBiblia

## Conventions

- Never rewrite published git history (no force push, rebase, amend, or squash of pushed commits).
- Bundle ID `com.cronobiblia.app`, URL scheme `cronobiblia://auth/callback`, IAP products `cronobiblia_premium_monthly` / `cronobiblia_premium_annual`, RevenueCat entitlement `premium` are finalized — do not change after the App Store Connect record exists.
- WHATWG URL gotcha: for custom schemes, `new URL("cronobiblia://auth/callback")` parses as host="auth", pathname="/callback". Always check `host` + `pathname`. (See `src/lib/auth.ts`.)
- Subscriptions go through Apple IAP via RevenueCat — never Stripe.
- Backend is Supabase Edge Functions; the app calls them via `VITE_SUPABASE_URL` (never hardcoded). No server routes in this repo. CI lives in `.github/workflows/ci.yml` and is owned by Track F — do not add other workflow files without coordinating.
- VITE_ env vars live in `.env` (never committed). Never create or commit `.env`; ship `.env.example` only.
- Editorial rules (spec §5/§12): neutrality language ("El texto bíblico presenta…", "La evidencia externa indica…", "La fecha es debatida…"), ranges before false precision, every factual card exposes sources. No "proves the Bible" absolutes.
- Spanish is the original experience — no translated-looking copy, no English leftovers in user-facing screens. Accents and punctuation preserved.
- A11y baseline: 44pt touch targets, VoiceOver labels, text alternatives for maps/images, reduced-motion support, rem-based type.

## Central brand constants

`src/lib/brand.ts` is the single source of truth for app name, bundle ID, URL scheme and auth callback. Import from there instead of re-declaring strings.

## Track contracts

- Track A (foundation) owns: routing/app shell, onboarding, auth, Descubrir, Perfil, paywall UI shell, `src/lib/purchases.ts` (stub contract), design tokens.
- Track B owns: `src/features/timeline/TimelineScreen.tsx`, `src/features/aprende/AprendeScreen.tsx`, `src/features/stories/StoryPlayer.tsx`, `src/features/quizzes/QuizRunner.tsx`, `src/content-renderer/ContentCard.tsx` (named export `ContentCard`), `src/lib/content.ts` (named content functions).
- Track C owns: `src/features/maps/MapsScreen.tsx`, `src/features/evidence/EvidenceDetail.tsx`.
- Track D owns: real RevenueCat wiring behind the `src/lib/purchases.ts` contract, Ask-a-Historian Edge Function.
- Cross-track defensive loading lives in `src/lib/content-safe.ts` and `src/lib/lazy-feature.tsx`: route files must load Track B/C screens and content through these helpers so missing modules degrade to Spanish "coming soon" states instead of blank screens or build errors.
