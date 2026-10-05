import { createFileRoute } from "@tanstack/react-router";
import { lazyFeatureScreen } from "@/lib/lazy-feature";

// Track B owns src/features/quizzes/QuizRunner.tsx (default export).
// The screen reads the content id with useParams({ from: "/quiz/$id" }).
const QuizRunner = lazyFeatureScreen(
  "/src/features/quizzes/QuizRunner.tsx",
  {
    title: "Cuestionario",
    description:
      "Los cuestionarios están en camino: preguntas con explicación inmediata muy pronto.",
    loadingLabel: "Cargando cuestionario…",
  },
);

export const Route = createFileRoute("/quiz/$id")({
  component: QuizRunner,
});
