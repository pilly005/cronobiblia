import { createFileRoute } from "@tanstack/react-router";
import { lazyFeatureScreen } from "@/lib/lazy-feature";

// Track C owns src/features/maps/MapsScreen.tsx (default export).
const MapsScreen = lazyFeatureScreen("/src/features/maps/MapsScreen.tsx", {
  title: "Mapas",
  description:
    "Los mapas de viajes están en camino: sigue las rutas de Abraham, el éxodo y Pablo muy pronto.",
  loadingLabel: "Cargando mapas…",
});

export const Route = createFileRoute("/tabs/mapas")({
  component: MapsScreen,
});
