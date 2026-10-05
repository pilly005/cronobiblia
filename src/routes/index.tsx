import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadProgress } from "@/lib/local-progress";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // First launch goes to onboarding; afterwards straight to Descubrir.
    // No paywall on first launch (spec §4).
    const { onboardingDone } = loadProgress();
    throw redirect({ to: onboardingDone ? "/tabs/descubrir" : "/onboarding" });
  },
});
