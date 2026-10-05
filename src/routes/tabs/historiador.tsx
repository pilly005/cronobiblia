import { createFileRoute } from "@tanstack/react-router";
import HistorianScreen from "@/features/historian/HistorianScreen";

export const Route = createFileRoute("/tabs/historiador")({
  component: HistorianScreen,
});
