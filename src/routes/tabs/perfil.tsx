import { createFileRoute } from "@tanstack/react-router";
import PerfilScreen from "@/features/perfil/PerfilScreen";

export const Route = createFileRoute("/tabs/perfil")({
  component: PerfilScreen,
});
