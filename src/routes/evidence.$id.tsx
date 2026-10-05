import { createFileRoute } from "@tanstack/react-router";
import { lazyFeatureScreen } from "@/lib/lazy-feature";

// Track C owns src/features/evidence/EvidenceDetail.tsx (default export).
// The screen reads the content id with useParams({ from: "/evidence/$id" }).
const EvidenceDetail = lazyFeatureScreen(
  "/src/features/evidence/EvidenceDetail.tsx",
  {
    title: "Evidencia",
    description:
      "Las tarjetas de evidencia arqueológica están en camino: artefactos, inscripciones y sitios con sus fuentes muy pronto.",
    loadingLabel: "Cargando evidencia…",
  },
);

export const Route = createFileRoute("/evidence/$id")({
  component: EvidenceDetail,
});
