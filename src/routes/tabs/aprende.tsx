import { createFileRoute } from "@tanstack/react-router";
import { lazyFeatureScreen } from "@/lib/lazy-feature";

// Track B owns src/features/aprende/AprendeScreen.tsx (default export).
const AprendeScreen = lazyFeatureScreen(
  "/src/features/aprende/AprendeScreen.tsx",
  {
    title: "Aprende",
    description:
      "Los recorridos y cuestionarios están en camino: historias guiadas y preguntas con explicación muy pronto.",
    loadingLabel: "Cargando Aprende…",
  },
);

export const Route = createFileRoute("/tabs/aprende")({
  component: AprendeScreen,
});
