import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // scrollRestoration disabled: it fights the iOS keyboard's auto-scroll
    // and was breaking text input on device (2026-10-05).
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
