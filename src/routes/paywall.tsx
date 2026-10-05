import { createFileRoute } from "@tanstack/react-router";
import PaywallScreen from "@/features/subscription/PaywallScreen";

export const Route = createFileRoute("/paywall")({
  component: PaywallScreen,
});
