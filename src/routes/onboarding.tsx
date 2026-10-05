import { createFileRoute } from "@tanstack/react-router";
import OnboardingScreen from "@/features/onboarding/OnboardingScreen";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingScreen,
});
