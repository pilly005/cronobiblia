import { createFileRoute } from "@tanstack/react-router";
import { lazyFeatureScreen } from "@/lib/lazy-feature";

// Track B owns src/features/timeline/TimelineScreen.tsx (default export).
const TimelineScreen = lazyFeatureScreen(
  "/src/features/timeline/TimelineScreen.tsx",
  {
    title: "Cronología",
    description:
      "La línea del tiempo interactiva está en camino: explora eventos, imperios y fechas en debate muy pronto.",
    loadingLabel: "Cargando cronología…",
  },
);

export const Route = createFileRoute("/tabs/cronologia")({
  component: TimelineScreen,
});
