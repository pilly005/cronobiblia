import { createFileRoute } from "@tanstack/react-router";
import { lazyFeatureScreen } from "@/lib/lazy-feature";

// Track B owns src/features/stories/StoryPlayer.tsx (default export).
// The screen reads the content id with useParams({ from: "/story/$id" }).
const StoryPlayer = lazyFeatureScreen(
  "/src/features/stories/StoryPlayer.tsx",
  {
    title: "Recorrido",
    description:
      "Los recorridos guiados están en camino: historias visuales de 5 a 10 minutos muy pronto.",
    loadingLabel: "Cargando recorrido…",
  },
);

export const Route = createFileRoute("/story/$id")({
  component: StoryPlayer,
});
