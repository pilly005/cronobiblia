import { createFileRoute } from "@tanstack/react-router";
import DescubrirScreen from "@/features/descubrir/DescubrirScreen";

export const Route = createFileRoute("/tabs/descubrir")({
  component: DescubrirScreen,
});
