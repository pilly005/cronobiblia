# CronoBiblia

**La historia alrededor de la Biblia.**

Interactive Bible-history app for Spanish-speaking learners — timelines, journey maps, evidence cards, guided stories and quizzes. Not a Bible reader.

- Client: React 19 + TypeScript + Vite + Tailwind CSS v4, TanStack Router (file-based routes in `src/routes/`)
- Native shell: Capacitor 7 (iOS 15+), bundle ID `com.cronobiblia.app`, deep link `cronobiblia://auth/callback`
- Backend: Supabase (Auth, Postgres, Edge Functions) via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- Purchases: Apple IAP via RevenueCat — entitlement `premium`; products `cronobiblia_premium_monthly` ($6.99) and `cronobiblia_premium_annual` ($49.99)

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Web dev server |
| `npm run build` | Production web build |
| `npm run build:capacitor` | Static SPA build for the native iOS app (`dist/` → `index.capacitor.html`) |

## Setup

1. Copy `.env.example` to `.env` and fill in the Supabase URL + anon key (never commit `.env`).
2. `npm ci`
3. Native: `npx cap add ios` on a Mac, open `ios/App/App.xcworkspace` in Xcode.

Product specification: `~/workspace/goals/ship-cronobiblia-to-the-app-store/files/build-spec/build-spec.md`.
